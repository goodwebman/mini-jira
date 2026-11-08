import type { VariantProps } from 'class-variance-authority';
import { forwardRef, memo, useState, type HTMLAttributes } from 'react';
import { cn } from '../../lib/cn';
import { getInitials, getTintByName } from './avatar-utils';
import { avatarVariants } from './UIAvatar.variants';

export interface IUIAvatarProps
  extends HTMLAttributes<HTMLSpanElement>, VariantProps<typeof avatarVariants> {
  readonly testId?: string;
  /** Имя: из него берутся инициалы, тинт и доступная подпись. */
  readonly name: string;
  /** Фото. Если не загрузилось, показываются инициалы. */
  readonly src?: string | null;
}

/**
 * Аватар: фото или инициалы на цветном круге. Тинт стабильно считается от имени,
 * его можно задать явно через `tint`.
 *
 * @example
 * <UIAvatar name="Анна Соколова" size="sm" />
 */
const UIAvatarRootBase = forwardRef<HTMLSpanElement, IUIAvatarProps>(
  ({ className, testId, name, src, size, tint, title = name, ...props }, ref) => {
    const [failedSrc, setFailedSrc] = useState<string | null>(null);
    const showImage = src != null && src !== '' && src !== failedSrc;

    return (
      <span
        ref={ref}
        role="img"
        aria-label={name}
        title={title}
        data-name={testId ? `UIAvatar-${testId}` : 'UIAvatar'}
        className={cn(avatarVariants({ size, tint: tint ?? getTintByName(name) }), className)}
        {...props}
      >
        {showImage ? (
          <img
            src={src}
            alt=""
            className="size-full object-cover"
            onError={() => {
              setFailedSrc(src);
            }}
          />
        ) : (
          getInitials(name)
        )}
      </span>
    );
  },
);
UIAvatarRootBase.displayName = 'UIAvatar';
export const UIAvatarRoot = memo(UIAvatarRootBase);
