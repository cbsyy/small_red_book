// 迁移脚本：将旧的 AIProfile（textModel/imageModel）转换为新的格式（kind/model）
// 运行方式：npx ts-node scripts/migrate-ai-profile.ts

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('开始迁移 AIProfile 数据...');

  // 获取所有旧记录
  const oldProfiles = await prisma.$queryRaw<any[]>`
    SELECT * FROM AIProfile WHERE textModel IS NOT NULL OR imageModel IS NOT NULL
  `;

  if (oldProfiles.length === 0) {
    console.log('没有需要迁移的旧数据');
    return;
  }

  console.log(`找到 ${oldProfiles.length} 条旧记录需要迁移`);

  for (const profile of oldProfiles) {
    // 如果有 textModel，创建一条 text 类型的记录
    if (profile.textModel) {
      const textName = `${profile.name} (文本)`;
      const exists = await prisma.aIProfile.findUnique({ where: { name: textName } });

      if (!exists) {
        await prisma.aIProfile.create({
          data: {
            name: textName,
            description: profile.description,
            kind: 'text',
            provider: profile.provider,
            baseURL: profile.baseURL,
            apiKey: profile.apiKey,
            model: profile.textModel,
            systemPrompt: profile.systemPrompt,
            isDefault: profile.isDefault,
            enabled: profile.enabled,
          },
        });
        console.log(`✓ 创建文本配置: ${textName}`);
      }
    }

    // 如果有 imageModel，创建一条 image 类型的记录
    if (profile.imageModel) {
      const imageName = `${profile.name} (图像)`;
      const exists = await prisma.aIProfile.findUnique({ where: { name: imageName } });

      if (!exists) {
        await prisma.aIProfile.create({
          data: {
            name: imageName,
            description: profile.description,
            kind: 'image',
            provider: profile.provider,
            baseURL: profile.baseURL,
            apiKey: profile.apiKey,
            model: profile.imageModel,
            isDefault: false,
            enabled: profile.enabled,
          },
        });
        console.log(`✓ 创建图像配置: ${imageName}`);
      }
    }

    // 删除旧记录
    await prisma.aIProfile.delete({ where: { id: profile.id } });
    console.log(`✓ 删除旧记录: ${profile.name}`);
  }

  console.log('迁移完成！');
}

main()
  .catch((e) => {
    console.error('迁移失败:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
