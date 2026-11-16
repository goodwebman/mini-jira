export { createComment } from './api/comment-api';
export { buildCommentThread } from './model/comment-thread';
export type * from './model';
export { CommentItem, type ICommentItemProps } from './ui/CommentItem';
export {
  commentMentionQuery,
  editCommentMentions,
  prepareCommentText,
} from './model/comment-mentions';
