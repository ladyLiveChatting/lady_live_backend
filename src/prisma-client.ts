/**
 * Single re-export of the generated Prisma client + enums via a relative path.
 * Avoids `@prisma/client` stub / path-mapping issues in `nest start --watch` / tsc.
 */
export {
  Prisma,
  PrismaClient,
  UserRole,
  CallStatus,
  WalletTxType,
  MessageType,
} from '../node_modules/.prisma/client';
