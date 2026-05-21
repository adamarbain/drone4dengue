#!/usr/bin/env node

/*
 * Create or update the local admin account used by Selenium tests.
 *
 * Run from the repository root after the local database is ready:
 *   node selenium-confest/setup_admin_account.js
 */

const fs = require('fs');
const path = require('path');

const THIS_DIR = __dirname;
const REPO_ROOT = path.resolve(THIS_DIR, '..');
const SERVER_DIR = path.join(REPO_ROOT, 'server-api');
const SELENIUM_ENV_PATH = path.join(THIS_DIR, '.env');

const dotenv = require(path.join(SERVER_DIR, 'node_modules', 'dotenv'));
const bcrypt = require(path.join(SERVER_DIR, 'node_modules', 'bcryptjs'));

dotenv.config({ path: path.join(SERVER_DIR, '.env') });
dotenv.config({ path: path.join(REPO_ROOT, '.env'), override: false });
dotenv.config({ path: SELENIUM_ENV_PATH, override: true });

const prisma = require(path.join(SERVER_DIR, 'prisma', 'client'));

const DEFAULTS = {
  adminUrl: 'http://localhost:3000',
  apiUrl: 'http://localhost:4000',
  email: 'admin1@drone4dengue.com',
  password: 'adminpass1',
  name: 'Selenium Admin',
  username: 'seleniumadmin',
  phone: '60119990001',
  organization: 'Drone4Dengue',
  companyId: 'comp-001',
  companyName: 'Drone4Dengue Main',
  companyCode: 'COMP001',
};

async function main() {
  const args = parseArgs(process.argv.slice(2));

  const config = {
    adminUrl: value(args['admin-url'], process.env.ADMIN_URL, process.env.BASE_URL, DEFAULTS.adminUrl),
    apiUrl: value(args['api-url'], process.env.API_URL, DEFAULTS.apiUrl),
    email: value(args.email, process.env.ADMIN_EMAIL, process.env.TEST_ADMIN_EMAIL, DEFAULTS.email),
    password: value(args.password, process.env.ADMIN_PASSWORD, process.env.TEST_ADMIN_PASSWORD, DEFAULTS.password),
    name: value(args.name, process.env.TEST_ADMIN_NAME, DEFAULTS.name),
    username: value(args.username, process.env.TEST_ADMIN_USERNAME, DEFAULTS.username),
    phone: value(args.phone, process.env.TEST_ADMIN_PHONE, DEFAULTS.phone),
    organization: value(args.organization, process.env.TEST_ADMIN_ORGANIZATION, DEFAULTS.organization),
    companyId: value(args['company-id'], process.env.TEST_COMPANY_ID, DEFAULTS.companyId),
    companyName: value(args['company-name'], process.env.TEST_COMPANY_NAME, DEFAULTS.companyName),
    companyCode: value(args['company-code'], process.env.TEST_COMPANY_CODE, DEFAULTS.companyCode),
  };

  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is missing. Check server-api/.env before running this script.');
  }

  const company = await ensureCompany(config);
  const user = await ensureAdmin(config, company.id);

  updateEnv(SELENIUM_ENV_PATH, {
    ADMIN_URL: config.adminUrl,
    BASE_URL: config.adminUrl,
    API_URL: config.apiUrl,
    ADMIN_EMAIL: config.email,
    ADMIN_PASSWORD: config.password,
    TEST_ADMIN_EMAIL: config.email,
    TEST_ADMIN_PASSWORD: config.password,
    TEST_COMPANY_ID: company.id,
  });

  console.log(`Selenium admin account is ready: ${user.email}`);
  console.log(`Company: ${company.name} (${company.id})`);
  console.log(`Updated Selenium env file: ${path.relative(REPO_ROOT, SELENIUM_ENV_PATH)}`);
}

async function ensureCompany(config) {
  const existingById = await prisma.company.findUnique({
    where: { id: config.companyId },
  });

  if (existingById) {
    return prisma.company.update({
      where: { id: existingById.id },
      data: {
        isActive: true,
      },
    });
  }

  const existingByCode = await prisma.company.findUnique({
    where: { code: config.companyCode },
  });

  if (existingByCode) {
    return existingByCode;
  }

  return prisma.company.create({
    data: {
      id: config.companyId,
      name: config.companyName,
      code: config.companyCode,
      description: 'Local company for Selenium admin tests',
      isActive: true,
    },
  });
}

async function ensureAdmin(config, companyId) {
  const passwordHash = await bcrypt.hash(config.password, 10);
  const existing = await prisma.user.findUnique({
    where: { email: config.email },
  });
  const phone = await availablePhone(config.phone, existing?.id);

  if (existing) {
    return prisma.user.update({
      where: { email: config.email },
      data: {
        password: passwordHash,
        name: config.name,
        role: 'admin',
        status: 'Verified',
        username: config.username,
        phone,
        organization: config.organization,
        companyId,
        authProvider: 'email',
      },
    });
  }

  return prisma.user.create({
    data: {
      email: config.email,
      password: passwordHash,
      name: config.name,
      role: 'admin',
      status: 'Verified',
      username: config.username,
      phone,
      address: 'Kuala Lumpur',
      organization: config.organization,
      companyId,
      authProvider: 'email',
    },
  });
}

async function availablePhone(phone, currentUserId) {
  if (!phone) {
    return null;
  }

  const owner = await prisma.user.findUnique({
    where: { phone },
    select: { id: true },
  });

  if (!owner || owner.id === currentUserId) {
    return phone;
  }

  return null;
}

function parseArgs(argv) {
  const args = {};
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token.startsWith('--')) {
      continue;
    }

    const withoutPrefix = token.slice(2);
    const equalsIndex = withoutPrefix.indexOf('=');
    if (equalsIndex !== -1) {
      args[withoutPrefix.slice(0, equalsIndex)] = withoutPrefix.slice(equalsIndex + 1);
      continue;
    }

    const next = argv[index + 1];
    if (next && !next.startsWith('--')) {
      args[withoutPrefix] = next;
      index += 1;
    } else {
      args[withoutPrefix] = 'true';
    }
  }
  return args;
}

function value(...candidates) {
  for (const candidate of candidates) {
    if (candidate !== undefined && candidate !== null && String(candidate).trim() !== '') {
      return String(candidate).trim();
    }
  }
  return '';
}

function updateEnv(envPath, updates) {
  const existingLines = fs.existsSync(envPath)
    ? fs.readFileSync(envPath, 'utf8').split(/\r?\n/)
    : [];

  const seen = new Set();
  const newLines = [];

  for (const line of existingLines) {
    if (!line.trim() || line.trimStart().startsWith('#') || !line.includes('=')) {
      if (line !== '') {
        newLines.push(line);
      }
      continue;
    }

    const key = line.split('=', 1)[0].trim();
    if (Object.prototype.hasOwnProperty.call(updates, key)) {
      newLines.push(`${key}=${updates[key]}`);
      seen.add(key);
    } else {
      newLines.push(line);
    }
  }

  for (const [key, val] of Object.entries(updates)) {
    if (!seen.has(key)) {
      newLines.push(`${key}=${val}`);
    }
  }

  fs.writeFileSync(envPath, `${newLines.join('\n')}\n`, 'utf8');
}

main()
  .catch((error) => {
    console.error(error.message || error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
