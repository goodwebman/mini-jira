/**
 * Иллюстрация панели входа из макета: доска с карточками и график.
 * Цвета зашиты: это картинка, а не интерфейс, тема на неё не влияет.
 */
export function AuthIllustration() {
  return (
    <svg
      viewBox='0 0 960 1080'
      preserveAspectRatio='xMidYMid slice'
      aria-hidden='true'
      className='absolute inset-0 block size-full'
    >
      <defs>
        <pattern
          id='auth-dots'
          width='26'
          height='26'
          patternUnits='userSpaceOnUse'
        >
          <circle cx='3' cy='3' r='3' fill='#ffffff' opacity='0.2' />
        </pattern>
      </defs>
      <rect width='960' height='1080' fill='#174a8c' />
      <circle cx='840' cy='130' r='330' fill='#1c58a3' />
      <circle cx='70' cy='980' r='360' fill='#123c74' />
      <rect x='640' y='60' width='260' height='156' fill='url(#auth-dots)' />
      <circle cx='812' cy='838' r='86' fill='#eb6834' />
      <g transform='rotate(-10 230 240)'>
        <rect x='96' y='108' width='300' height='220' rx='24' fill='#ffffff' />
        <rect x='126' y='138' width='124' height='12' rx='6' fill='#27364f' />
        <rect x='126' y='162' width='78' height='9' rx='4.5' fill='#c3ccd9' />
        <rect x='126' y='244' width='34' height='56' rx='6' fill='#b9cdea' />
        <rect x='172' y='216' width='34' height='84' rx='6' fill='#b9cdea' />
        <rect x='218' y='234' width='34' height='66' rx='6' fill='#b9cdea' />
        <rect x='264' y='192' width='34' height='108' rx='6' fill='#256abf' />
        <rect x='310' y='178' width='34' height='122' rx='6' fill='#eb6834' />
      </g>
      <g transform='rotate(-6 490 540)'>
        <rect x='170' y='250' width='640' height='520' rx='30' fill='#ffffff' />
        <rect x='206' y='284' width='190' height='16' rx='8' fill='#27364f' />
        <rect x='640' y='278' width='134' height='30' rx='15' fill='#256abf' />
        {[200, 397, 594].map((x) => (
          <rect
            key={x}
            x={x}
            y='330'
            width='186'
            height='410'
            rx='20'
            fill='#eef1f6'
          />
        ))}
        <rect x='212' y='376' width='162' height='104' rx='12' fill='#ffffff' />
        <rect x='226' y='392' width='110' height='10' rx='5' fill='#27364f' />
        <rect x='226' y='450' width='46' height='14' rx='7' fill='#199e70' />
        <rect x='212' y='492' width='162' height='128' rx='12' fill='#ffffff' />
        <rect x='226' y='508' width='124' height='10' rx='5' fill='#27364f' />
        <rect x='226' y='590' width='46' height='14' rx='7' fill='#6250d6' />
        <rect x='409' y='376' width='162' height='128' rx='12' fill='#ffffff' />
        <rect x='423' y='392' width='118' height='10' rx='5' fill='#27364f' />
        <rect x='423' y='474' width='46' height='14' rx='7' fill='#eb6834' />
        <rect x='409' y='516' width='162' height='104' rx='12' fill='#ffffff' />
        <rect x='423' y='532' width='104' height='10' rx='5' fill='#27364f' />
        <rect x='423' y='590' width='46' height='14' rx='7' fill='#256abf' />
        <rect x='606' y='376' width='162' height='96' rx='12' fill='#ffffff' />
        <rect x='620' y='392' width='112' height='10' rx='5' fill='#27364f' />
        <rect x='620' y='442' width='46' height='14' rx='7' fill='#199e70' />
      </g>
      <g transform='rotate(5 690 690)'>
        <rect
          x='552'
          y='622'
          width='300'
          height='186'
          rx='22'
          fill='#0b2a55'
          opacity='0.35'
        />
        <rect x='540' y='606' width='300' height='186' rx='22' fill='#ffffff' />
        <rect x='566' y='634' width='150' height='13' rx='6.5' fill='#27364f' />
        <rect x='566' y='660' width='112' height='10' rx='5' fill='#c3ccd9' />
        <rect x='566' y='744' width='66' height='20' rx='10' fill='#eb6834' />
        <circle cx='790' cy='654' r='26' fill='#199e70' />
        <path
          d='M778 654l9 9 16-18'
          fill='none'
          stroke='#ffffff'
          strokeWidth='5'
          strokeLinecap='round'
          strokeLinejoin='round'
        />
        <circle cx='770' cy='754' r='16' fill='#b9cdea' />
        <circle cx='794' cy='754' r='16' fill='#c9c1f0' />
      </g>
    </svg>
  );
}
