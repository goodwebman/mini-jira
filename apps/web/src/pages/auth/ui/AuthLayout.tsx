import type { ReactNode } from 'react';

import { UIBrand, UISeparator } from '@/shared/ui';

import { AuthIllustration } from './AuthIllustration';

/**
 * От 960 px справа панель с примером доски. От 640 до 960 px форма в карточке,
 * на телефоне форма во всю ширину.
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
    <div className='mx-auto flex min-h-dvh w-full max-w-[1920px] bg-surface max-w960:w640:bg-background'>
      <main className='flex min-w-0 flex-[1_1_0] justify-center overflow-y-auto px-4 py-6 w640:items-center w640:px-6 w640:py-8'>
        <section className='my-auto flex w-full max-w-[400px] flex-col gap-5 w640:max-w960:max-w-[440px] w640:max-w960:rounded-modal w640:max-w960:border w640:max-w960:border-border w640:max-w960:bg-surface w640:max-w960:p-8 w1920:max-w-[480px]'>
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
      <aside className='hidden min-w-0 flex-[1_1_0] items-center justify-center border-s border-border bg-background px-6 py-8 w960:flex w1280:px-12'>
        <div className='flex w-full max-w-[640px] flex-col gap-5'>
          <div className='max-w-[26rem] text-display font-medium text-foreground'>
            Доски задач и метрики спринта
          </div>
          <AuthIllustration />
        </div>
      </aside>
    </div>
  );
}
