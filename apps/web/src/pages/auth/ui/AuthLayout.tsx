import type { ReactNode } from 'react';

import { UIBrand, UISeparator } from '@/shared/ui';

import { AuthIllustration } from './AuthIllustration';

/**
 * Экран входа и регистрации. От 800 px справа панель с иллюстрацией,
 * на 520–799 форма в карточке на сером фоне, на телефоне — во всю ширину.
 */
export function AuthLayout({
  title,
  subtitle,
  form,
  alternative,
  footer,
}: {
  readonly title: string;
  readonly subtitle: string;
  readonly form: ReactNode;
  /** Вход через провайдеров под разделителем «или». */
  readonly alternative: ReactNode;
  readonly footer: ReactNode;
}) {
  return (
    <div className='flex min-h-dvh bg-surface max-md:sm:bg-background'>
      <main className='flex min-w-0 flex-[1_1_0] justify-center overflow-y-auto px-4 py-6 sm:items-center sm:px-6 sm:py-8'>
        <section className='my-auto flex w-full max-w-[400px] flex-col gap-5 sm:max-md:max-w-[440px] sm:max-md:rounded-modal sm:max-md:border sm:max-md:border-border sm:max-md:bg-surface sm:max-md:p-8 xl:max-w-[480px]'>
          <UIBrand />
          <div className='flex flex-col gap-1'>
            <h1 className='m-0 text-display font-semibold tracking-title'>
              {title}
            </h1>
            <p className='m-0 text-muted-foreground'>{subtitle}</p>
          </div>
          {form}
          <UISeparator label='или' />
          {alternative}
          <p className='m-0 text-center text-muted-foreground'>{footer}</p>
        </section>
      </main>
      <aside className='relative hidden min-w-0 flex-[1_1_0] overflow-hidden text-primary-foreground md:block'>
        <AuthIllustration />
        <div className='absolute inset-x-8 bottom-8 flex flex-col gap-2 lg:inset-x-14 lg:bottom-14 xl:inset-x-[72px] xl:bottom-[72px]'>
          <div className='text-[28px] leading-[1.15] font-bold tracking-display lg:text-[40px] xl:text-[52px]'>
            mini-jira
          </div>
          <div className='text-lead text-primary-tint'>
            Доски, задачи и метрики спринта в одном месте
          </div>
        </div>
      </aside>
    </div>
  );
}
