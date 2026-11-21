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
  UpdateBoardBody,
  UpdateMemberBody,
} from '@gwmt/contracts';
