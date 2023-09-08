import styles from './index.module.css'
import React, { useEffect } from 'react'
import clsx from 'clsx'
import SharedContext from '@site/src/utils/SharedContext'

export type CliBlock = {
  text?: string,
  color?: 'yellow' | 'green' | 'blue' | 'red', // undefined means normal
  bold?: boolean,
  underline?: boolean,
  type?: 'input' | 'output' | 'linefeed' // undefined means input
  wait?: number,
}

type CliAnimateProps = {
  blocks: CliBlock[],
  windowStyle?: React.CSSProperties,
  onDone?: () => void,
  autoReplay?: boolean,
}

const INPUT_INTERVAL = 80;
const OUTPUT_DELAY = 20;
const FINISH_DELAY = 5000;

export default function CliAnimation({ blocks, onDone, windowStyle, autoReplay }: CliAnimateProps) {
  const [lines, setLines] = React.useState<CliBlock[][]>([[]])
  const containerRef = React.useRef<HTMLDivElement>(null);

  // set timeout to delay async function
  async function delay(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }


  React.useEffect(() => {
    let cancel = false;
    const runAnimation = async () => {
      let current = 0;
      let currentChar = 0;
      let block: CliBlock | undefined = undefined;
      let lines: CliBlock[][] = [[]];
      while (true) {
        if (cancel) return;
        if (current >= blocks.length) {
          await delay(FINISH_DELAY);
          onDone?.();
          if (!autoReplay) return;
          else {
            current = 0;
            currentChar = 0;
            lines = [[]];
          }
        }
        block = blocks[current]
        if (block.type === 'linefeed') {
          lines.push([])
          current++
        }
        else {
          const lastLine = lines[lines.length - 1] || []
          if (block.type === 'output') {
            lastLine.push(block);
            current++
          }
          else {
            await delay(INPUT_INTERVAL);
            if (currentChar === 0) {
              lastLine.push({ ...block, text: block.text.slice(0, 1), color: undefined, bold: undefined, underline: undefined })
            }
            else {
              lastLine[lastLine.length - 1].text += block.text[currentChar];
            }
            currentChar++;
            if (currentChar >= block.text.length) {
              lastLine[lastLine.length - 1] = block
              currentChar = 0;
              current++;
            }
          }
        }
        if (cancel) return;
        setLines([...lines]);
        await delay(OUTPUT_DELAY);
        if (block?.wait && currentChar == 0) await delay(block.wait);
      }
    };

    runAnimation();

    return () => {
      cancel = true;
    }
  }, [blocks]);

  useEffect(() => {
    containerRef.current?.scrollTo(0, containerRef.current.scrollHeight)
  }, [lines]);


  return (<div className={styles.window} style={windowStyle}>
    <svg x="14px" y="9px" xmlns="http://www.w3.org/2000/svg" width="54" height="14" viewBox="0 0 54 14">
      <g fill="none" fillRule="evenodd">
        <circle cx="6" cy="6" r="6" fill="#FF5F56" stroke="#E0443E" strokeWidth=".5"
          xmlns="http://www.w3.org/2000/svg" />
        <circle cx="26" cy="6" r="6" fill="#FFBD2E" stroke="#DEA123" strokeWidth=".5"
          xmlns="http://www.w3.org/2000/svg" />
        <circle cx="46" cy="6" r="6" fill="#27C93F" stroke="#1AAB29" strokeWidth=".5"
          xmlns="http://www.w3.org/2000/svg" />
      </g>
    </svg>

    <div className={styles.container} ref={containerRef}>
      {lines.map((line, i) => (<div key={i} className={styles.line}>
        {line.map((block, j) => (<React.Fragment key={`${i}-${j}`}>
          <span className={clsx(styles.block, block.bold && styles['code-bold'], block.underline && styles['code-underline'], block.color && styles['code-' + block.color])}>{block.text || ""}</span>
          {j === line.length - 1 && i === lines.length - 1 && <span className={styles.cursor}>█</span>}
        </React.Fragment>
        ))}
      </div>))}
    </div>
  </div>)
}


export function makeOutputLine(text: string, wait?: number,
  color?: 'yellow' | 'green' | 'blue' | 'red',
  bold?: boolean,
  underline?: boolean,): CliBlock[] {
  if (color === undefined) {
    if (text.startsWith('[*]') || text.startsWith('[?]')) color = 'yellow';
    if (text.startsWith('[+]') || text.startsWith('[!]')) color = 'green';
  }
  return [
    { text, color, bold, underline, type: 'output', wait },
    { type: 'linefeed' }
  ]
}

export function makeCliInput(text: string = ""): CliBlock[] {
  return [
    { text: '[>] ', type: 'output' },
    { text: text, type: 'input', wait: 800 },
    { type: 'linefeed' },
  ]

}

const logoBlock: CliBlock[] = [
  ...makeOutputLine(' _   _ _   _ ____ _____ __  __ ___ ____  ____   ___  ____  '),
  ...makeOutputLine('| | | | | | / ___|_   _|  \\/  |_ _|  _ \\|  _ \\ / _ \\|  _ \\ '),
  ...makeOutputLine('| |_| | | | \\___ \\ | | | |\\/| || || |_) | |_) | | | | |_) |'),
  ...makeOutputLine('|  _  | |_| |___) || | | |  | || ||  _ <|  _ <| |_| |  _ < '),
  ...makeOutputLine('|_| |_|\\___/|____/ |_| |_|  |_|___|_| \\_\\_| \\_\\\\___/|_| \\_\\'),
  ...makeOutputLine(''),
  ...makeOutputLine('hustmirror-cli v0.2.0-rc build 2023-09-06 16:19:46 UTC'),
]

type BlockGen = (_http: string, _domain: string) => CliBlock[];


const ubuntuBlock: BlockGen = (_http, _domain) => [
  { text: '$ ', type: 'output', color: 'green' },
  { text: 'curl ', color: 'green' },
  { text: '-sSfL ' },
  { text: `${_http}://${_domain}/get`, underline: true },
  { text: ' | ', color: 'blue' },
  { text: 'sh ', color: 'green' },
  { text: '-s -- -i' },
  { type: 'linefeed' },
  ...logoBlock,
  ...makeOutputLine('[*] Reading configuration file...', 100),
  ...makeOutputLine('[*] Checking the environment and mirrors to install...', 1000),
  ...makeOutputLine('[!] The following software(s) are available to install:'),
  ...makeOutputLine('    ubuntu'),
  ...makeOutputLine('[?] What do you want to install? [all]'),
  ...makeOutputLine('    (a)ll for ready, all! (a!) for all software(s), including unsure ones.', 0, 'yellow'),
  ...makeOutputLine('    <softwares> for specific softwares, use space to separate multiple softwares.', 0, 'yellow'),
  ...makeOutputLine('    (l)ist for forcely list all softwares, even is not supported here.', 0, 'yellow'),
  ...makeOutputLine(''),
  ...makeOutputLine('    Other options:', 0, 'yellow'),
  ...makeOutputLine('    (r)ecover for uninstall software mirror.', 0, 'yellow'),
  ...makeOutputLine('    (i)nstall or update hust-mirror locally', 0, 'yellow'),
  ...makeOutputLine('    (q)uit for exit.', 0, 'yellow'),
  ...makeCliInput('all'),
  ...makeOutputLine('[*] Deploying ubuntu...', 1000),
  ...makeOutputLine('[WARN] You are not root, trying to use sudo...'),
  { text: '[sudo] password for user: ', type: 'output' },
  { text: '***********' },
  { type: 'linefeed' },
  ...makeOutputLine('[?] Use official secure source? [Y/n]'),
  ...makeCliInput('n'),
  ...makeOutputLine('[?] Use proposed source? [y/N]'),
  ...makeCliInput(),
  ...makeOutputLine('[?] Use source code? [y/N]'),
  ...makeCliInput(),
  ...makeOutputLine('[?] Do you want to apt update? [Y/n]', 1000),
  ...makeCliInput('no'),
  ...makeOutputLine('[+] Successfully deployed ubuntu.'),
  { type: 'linefeed' },
  { text: '$ ', type: 'output', color: 'green' },
  { text: 'sudo', color: 'green', underline: true },
  { text: ' apt ', color: 'green' },
  { text: 'update' },
  { type: 'linefeed' },
  ...ubuntuUpdateBlock(_http, _domain),
  { type: 'linefeed' },
  { text: '$ ', type: 'output', color: 'green' },
];

const installBlock: BlockGen = (_http, _domain) => [
  { text: '$ ', type: 'output', color: 'green' },
  { text: 'curl ', color: 'green' },
  { text: '-sSfL ' },
  { text: `${_http}://${_domain}/get`, underline: true },
  { text: ' | ', color: 'blue' },
  { text: 'sh ', color: 'green' },
  { text: '-s -- install' },
  { type: 'linefeed' },
  ...makeOutputLine('[*] Reading configuration file...'),
  ...makeOutputLine('[*] Downloading latest hust-mirror...', 3000),
  ...makeOutputLine('[+] Successfully install hust-mirror.'),
  ...makeOutputLine('[+] Now, you can use `hustmirror` in your command line'),
  { type: 'linefeed' },
  { text: '$ ', type: 'output', color: 'green' },
  { text: 'hustmirror', color: 'green' },
  { text: ' -V' },
  { type: 'linefeed' },
  ...logoBlock,
  { type: 'linefeed' },
  { text: '$ ', type: 'output', color: 'green' },
]


const ubuntuUpdateBlock: BlockGen = (_http, _domain) => [
  ...makeOutputLine(`Get:1 ${_http}://${_domain}/ubuntu jammy InRelease`, 1000),
  ...makeOutputLine(`Get:2 ${_http}://${_domain}/ubuntu jammy-updates InRelease [119 kB]`, 300),
  ...makeOutputLine(`Get:3 ${_http}://${_domain}/ubuntu jammy-updates/main amd64 DEP-11 Metadata [101 kB]`, 300),
  ...makeOutputLine(`Get:4 ${_http}://${_domain}/ubuntu jammy-updates/universe amd64 Packages [979 kB]`, 1000),
  ...makeOutputLine(`Get:5 ${_http}://${_domain}/ubuntu jammy-updates/universe i386 Packages [653 kB]`, 300),
  ...makeOutputLine(`Get:6 ${_http}://${_domain}/ubuntu jammy-updates/universe amd64 DEP-11 Metadata [289 kB]`, 300),
  ...makeOutputLine(`Get:7 ${_http}://${_domain}/ubuntu jammy-updates/universe amd64 c-n-f Metadata [21.8 kB]`, 300),
  { text: 'Reading package lists... ', type: 'output', wait: 2000 },
  ...makeOutputLine('Done', 300),
  { text: 'Building dependency tree... ', type: 'output', wait: 2000 },
  ...makeOutputLine('Done', 300),
  { text: 'Reading state information... ', type: 'output', wait: 2000 },
  ...makeOutputLine('Done', 300),
  ...makeOutputLine('96 packages can be upgraded. Run \'apt list--upgradable\' to see them.'),
]

const ubuntuADBlock: (_http: string, _domain: string) => CliBlock[] = (_http, _domain) => [
  { text: '$ ', type: 'output', color: 'green' },
  { text: 'hustmirror ', color: 'green' },
  { text: 'autodeploy ' },
  { type: 'linefeed' },
  ...logoBlock,
  ...makeOutputLine('[*] Reading configuration file...'),
  ...makeOutputLine('[WARN] No configuration file found.'),
  ...makeOutputLine('[*] Checking the environment and mirrors to install...'),
  ...makeOutputLine('[*] Deploying ubuntu...'),
  ...ubuntuUpdateBlock(_http, _domain),
  ...makeOutputLine('[+] Successfully deployed ubuntu.'),
  { type: 'linefeed' },
  { text: '$ ', type: 'output', color: 'green' },

]


CliAnimation.UbuntuSample = (props: Omit<CliAnimateProps, 'blocks'>) => {
  const ctx = React.useContext(SharedContext);
  const _http = ctx.https ? "https" : "http";
  const _domain = ctx.domain;

  const [current, setCurrent] = React.useState(0);

  const blocks = [
    // ubuntuBlock,
    installBlock,
    ubuntuADBlock,
  ]

  const block = blocks[current](_http, _domain);
  const onDone = () => {
    setCurrent((current + 1) % blocks.length);
  }

  return (<CliAnimation blocks={block} windowStyle={props.windowStyle} onDone={onDone} />)
}

CliAnimation.UbuntuInteractiveSample = (props: Omit<CliAnimateProps, 'blocks'>) => {
  const ctx = React.useContext(SharedContext);
  const _http = ctx.https ? "https" : "http";
  const _domain = ctx.domain;
  const block = ubuntuBlock(_http, _domain);
  return (<CliAnimation blocks={block} windowStyle={props.windowStyle} autoReplay />)
}


CliAnimation.InstallSample = (props: Omit<CliAnimateProps, 'blocks'>) => {
  const ctx = React.useContext(SharedContext);
  const _http = ctx.https ? "https" : "http";
  const _domain = ctx.domain;
  const block = installBlock(_http, _domain);
  return (<CliAnimation blocks={block} windowStyle={props.windowStyle} autoReplay />)
}

CliAnimation.UbuntuAutoDeploySample = (props: Omit<CliAnimateProps, 'blocks'>) => {
  const ctx = React.useContext(SharedContext);
  const _http = ctx.https ? "https" : "http";
  const _domain = ctx.domain;
  const block = ubuntuADBlock(_http, _domain);
  return (<CliAnimation blocks={block} windowStyle={props.windowStyle} autoReplay />)
}
