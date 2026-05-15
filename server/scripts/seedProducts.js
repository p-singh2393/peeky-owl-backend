import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname, '../../.env') });
import fs from 'node:fs/promises';
import path from 'node:path';
import vm from 'node:vm';
import ts from 'typescript';
import mongoose from 'mongoose';
import { connectDB } from '../config/db.js';
import { Product } from '../models/Product.js';

const sourcePath = path.resolve(__dirname, '../../src/data/products.ts');

async function loadProductsFromSource() {
  const source = await fs.readFile(sourcePath, 'utf8');
  const executableSource = source
    .replace(/^import type .+;\n/m, '')
    .replace('export const PRODUCTS', 'const PRODUCTS');

  const compiled = ts.transpileModule(`${executableSource}\nPRODUCTS;`, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText;

  const context = vm.createContext({ Date });
  return vm.runInContext(compiled, context, { filename: sourcePath });
}

await connectDB();

const products = await loadProductsFromSource();
const now = new Date();

await Product.bulkWrite(
  products.map(product => {
    const { _id, createdAt, updatedAt, ...data } = product;

    return {
      updateOne: {
        filter: { slug: data.slug },
        update: {
          $set: { ...data, updatedAt: updatedAt ? new Date(updatedAt) : now },
          $setOnInsert: { createdAt: createdAt ? new Date(createdAt) : now },
        },
        upsert: true,
      },
    };
  }),
);

console.log(`Seeded ${products.length} products into MongoDB`);
await mongoose.disconnect();
