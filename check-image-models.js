const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

async function check() {
  const imageModels = await p.imageModelProvider.findMany();
  console.log('Image models:', imageModels.length);
  imageModels.forEach(x => {
    console.log('- ' + x.alias + ' (' + x.provider + ') enabled=' + x.enabled);
  });
  await p.$disconnect();
}

check().catch(console.error);
