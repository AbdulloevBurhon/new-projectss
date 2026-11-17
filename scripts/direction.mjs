import { accessSync, readFileSync } from 'node:fs'
import { cp, readFile, rename, rm, writeFile } from 'node:fs/promises'
import { createInterface } from 'node:readline/promises'
import { stdin, stdout } from 'node:process'
import path from 'node:path'

const root = process.cwd()
const builtIn = new Set(['tsekh', 'shawarma', 'production'])
const textExtensions = new Set(['.vue', '.ts', '.md', '.json', '.css', '.js'])

function assertRepository() {
  const packageJson = JSON.parse(readFileSync(path.join(root, 'package.json')))
  if (packageJson.name !== 'obshaya-programma') throw new Error('Запустите команду из корня репозитория.')
  return packageJson
}

async function readJson(file) {
  return JSON.parse(await readFile(file, 'utf8'))
}

async function writeJson(file, value) {
  await writeFile(file, `${JSON.stringify(value, null, 2)}\n`, 'utf8')
}

function validateId(id) {
  if (!/^[a-z][a-z0-9-]{1,30}$/.test(id)) {
    throw new Error('ID должен быть в нижнем регистре, начинаться с буквы и содержать только a-z, 0-9 и дефис (2–31 символ).')
  }
  if (builtIn.has(id)) throw new Error(`Направление «${id}» встроенное, его нельзя удалить или создать повторно.`)
}

async function walk(directory, callback) {
  const { readdir, stat } = await import('node:fs/promises')
  for (const entry of await readdir(directory)) {
    const file = path.join(directory, entry)
    if ((await stat(file)).isDirectory()) await walk(file, callback)
    else await callback(file)
  }
}

async function createDirection(id, label) {
  validateId(id)
  if (!label?.trim()) throw new Error('Укажите название: npm run create:direction -- bakery "Пекарня"')
  if (/[\r\n\u0000-\u001f"<>`]/.test(label)) throw new Error('Название должно быть одной строкой без управляющих символов и символов < > " `.')

  const packageJson = await readJson(path.join(root, 'package.json'))
  const contractPath = path.join(root, 'shared/contracts/index.ts')
  const contract = await readFile(contractPath, 'utf8')
  const registeredProducts = contract.match(/^  [a-z][a-z0-9-]*:/gm)?.length ?? 0
  const destination = path.join(root, id)
  if (packageJson.workspaces.includes(id) || contract.includes(`  ${id}:`) || existsSync(destination)) {
    throw new Error(`Направление «${id}» уже существует или зарегистрировано.`)
  }

  const labelLiteral = `'${label.trim().replaceAll('\\', '\\\\').replaceAll("'", "\\'")}'`
  const productEntry = `  ${id}: ${labelLiteral},\n`
  const updatedContract = contract.replace(/(  production: 'Простое производство',\r?\n)(} as const)/, `$1${productEntry}$2`)
  if (updatedContract === contract) throw new Error('Не удалось найти список направлений в shared/contracts/index.ts.')

  const lock = await readJson(path.join(root, 'package-lock.json'))
  if (!lock.packages.production || !lock.packages[''].workspaces.includes('production')) {
    throw new Error('Не найден workspace production в package-lock.json.')
  }
  const source = path.join(root, 'production')
  packageJson.workspaces.push(id)
  packageJson.scripts[`dev:${id}`] = `npm run dev --workspace @obshaya/${id} -- --port ${3001 + registeredProducts}`
  lock.packages[''].workspaces.push(id)
  lock.packages[id] = structuredClone(lock.packages.production)
  lock.packages[id].name = `@obshaya/${id}`
  lock.packages[`node_modules/@obshaya/${id}`] = { resolved: id, link: true }

  const originals = new Map([
    [path.join(root, 'package.json'), await readFile(path.join(root, 'package.json'), 'utf8')],
    [path.join(root, 'package-lock.json'), await readFile(path.join(root, 'package-lock.json'), 'utf8')],
    [contractPath, contract],
  ])
  try {
    await cp(source, destination, {
      recursive: true,
      filter: (sourcePath) => !['node_modules', '.nuxt', '.output', '.data'].includes(path.basename(sourcePath)),
    })
    const initial = [...label.trim()][0] ?? ''
    await walk(destination, async (file) => {
      if (!textExtensions.has(path.extname(file))) return
      let content = await readFile(file, 'utf8')
      content = content.replaceAll('Простое производство', label.trim())
        .replaceAll('production', id)
        .replaceAll('logo-text="П"', `logo-text="${initial}"`)
      await writeFile(file, content, 'utf8')
    })
    await writeJson(path.join(root, 'package.json'), packageJson)
    await writeJson(path.join(root, 'package-lock.json'), lock)
    await writeFile(contractPath, updatedContract, 'utf8')
  } catch (error) {
    await rm(destination, { recursive: true, force: true })
    for (const [file, contents] of originals) await writeFile(file, contents, 'utf8')
    throw error
  }

  console.log(`Создано направление «${label.trim()}» (${id}) на основе production.`)
  console.log(`Запуск: npm run dev:${id}`)
  console.log('Для работы через облако примените миграцию 0004 и разверните обновлённые API и админку. Данные облака эта команда не меняет.')
}

async function removeDirection(id) {
  validateId(id)
  const packagePath = path.join(root, 'package.json')
  const lockPath = path.join(root, 'package-lock.json')
  const contractPath = path.join(root, 'shared/contracts/index.ts')
  const packageJson = await readJson(packagePath)
  const lock = await readJson(lockPath)
  const contract = await readFile(contractPath, 'utf8')
  const directory = path.resolve(root, id)
  const workspaceLink = path.join(root, 'node_modules/@obshaya', id)
  if (path.dirname(directory) !== root || !packageJson.workspaces.includes(id) || !lock.packages[id]) {
    throw new Error(`Созданное направление «${id}» не найдено.`)
  }

  const entryPattern = new RegExp(`^  ${id}:.*\\r?\\n`, 'm')
  if (!entryPattern.test(contract)) throw new Error(`Не найдена регистрация «${id}» в shared/contracts/index.ts.`)
  const updatedContract = contract.replace(entryPattern, '')
  packageJson.workspaces = packageJson.workspaces.filter((workspace) => workspace !== id)
  delete packageJson.scripts[`dev:${id}`]
  lock.packages[''].workspaces = lock.packages[''].workspaces.filter((workspace) => workspace !== id)
  delete lock.packages[id]
  delete lock.packages[`node_modules/@obshaya/${id}`]

  const prompt = createInterface({ input: stdin, output: stdout })
  const answer = await prompt.question(`Удалить локальный проект «${id}» и его регистрации? Напишите REMOVE ${id}: `)
  prompt.close()
  if (answer !== `REMOVE ${id}`) {
    console.log('Отменено. Файлы и регистрации не изменены.')
    return
  }

  const quarantine = path.join(root, `.removing-${id}-${Date.now()}`)
  const originals = new Map([
    [packagePath, await readFile(packagePath, 'utf8')],
    [lockPath, await readFile(lockPath, 'utf8')],
    [contractPath, contract],
  ])
  await rename(directory, quarantine)
  try {
    await writeJson(packagePath, packageJson)
    await writeJson(lockPath, lock)
    await writeFile(contractPath, updatedContract, 'utf8')
    await rm(quarantine, { recursive: true })
  } catch (error) {
    for (const [file, contents] of originals) await writeFile(file, contents, 'utf8')
    await rename(quarantine, directory).catch(() => {})
    throw error
  }
  console.log(`Локальное направление «${id}» удалено.`)
  await rm(workspaceLink, { force: true }).catch(() => console.warn('Не удалось убрать ссылку workspace из node_modules; её можно очистить командой npm install.'))
  console.log('Cloudflare-лицензии, архивы и файлы обновлений сохранены; для их удаления нужна отдельная облачная очистка.')
}

function existsSync(file) {
  try { accessSync(file); return true } catch { return false }
}

const command = process.argv[2]
const id = process.argv[3]
const label = process.argv[4]
assertRepository()

if (command === 'create') await createDirection(id, label)
else if (command === 'remove') await removeDirection(id)
else throw new Error('Используйте команду create или remove.')
