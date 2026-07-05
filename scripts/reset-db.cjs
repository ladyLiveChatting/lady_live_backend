const { PrismaClient } = require('@prisma/client');

require('./prisma-env.cjs');

const prisma = new PrismaClient();

async function main() {
  console.log('→ Deleting all app data (users, logins, chats, calls, wallets)...');

  const counts = await prisma.$transaction([
    prisma.message.deleteMany(),
    prisma.conversationParticipant.deleteMany(),
    prisma.conversation.deleteMany(),
    prisma.call.deleteMany(),
    prisma.walletTransaction.deleteMany(),
    prisma.wallet.deleteMany(),
    prisma.refreshToken.deleteMany(),
    prisma.profile.deleteMany(),
    prisma.user.deleteMany(),
  ]);

  const labels = [
    'messages',
    'conversation participants',
    'conversations',
    'calls',
    'wallet transactions',
    'wallets',
    'refresh tokens',
    'profiles',
    'users',
  ];
  counts.forEach((r, i) => {
    console.log(`   ${labels[i]}: ${r.count} deleted`);
  });

  console.log('→ Done. Database is empty.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
