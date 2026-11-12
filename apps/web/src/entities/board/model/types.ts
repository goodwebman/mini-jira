import type { boardsQuerySchema } from '@gwmt/contracts';

export type BoardsQuery = ReturnType<typeof boardsQuerySchema.parse>;
export type {
  AddMemberBody,
  BoardDetail,
  BoardListItem,
  BoardListResponse,
  BoardMember,
  BoardRole,
  CreateBoardBody,
  UpdateMemberBody,
} from '@gwmt/contracts';
