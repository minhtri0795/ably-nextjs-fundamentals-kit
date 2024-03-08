'use client'

import * as Ably from 'ably';
import { AblyProvider, useChannel } from "ably/react"
import { MouseEventHandler, MouseEvent, useState } from 'react'
import Logger, { LogEntry } from '../../components/logger';
import SampleHeader from '../../components/SampleHeader';
import useSound from "use-sound";


export default function PubSubClient() {

  const client = new Ably.Realtime.Promise ({ authUrl: '/token', authMethod: 'POST' });

  return (
    <AblyProvider client={ client }>
      <div className="flex flex-row justify-center">
        <div className="flex flex-col justify-start items-start gap-10">
          <SampleHeader sampleName="Pub/Sub Channels" sampleIcon="PubSubChannels.svg" sampleDocsLink="https://ably.com/docs/getting-started/react#useChannel" />
          <div className="font-manrope text-base max-w-screen-sm text-slate-800 text-opacity-100 leading-6 font-light">
            Publish messages on channels and subscribe to channels to receive messages. Click&nbsp;<span className="font-medium">Publish from Client</span>&nbsp;to publish a message on a channel from the web browser client. Click&nbsp;<span className="font-medium">Publish from Server</span>&nbsp;to publish a message from a serverless function.
          </div>
          <PubSubMessages />
        </div>      
        <TimerGroup/>
      </div>
    </AblyProvider>
  )
}

function PubSubMessages() {

  const [logs, setLogs] = useState<Array<LogEntry>>([])

  const { channel } = useChannel("status-updates", (message: Ably.Types.Message) => {
    setLogs(prev => [...prev, new LogEntry(`✉️ event name: ${message.name} text: ${message.data.text}`)])
  });
  
  const [messageText, setMessageText] = useState<string>('A message')

  const publicFromClientHandler: MouseEventHandler = (_event: MouseEvent<HTMLButtonElement>) => {
    if(channel === null) return
    channel.publish('update-from-client', {text: `${messageText} @ ${new Date().toISOString()}`})
  }

  const publicFromServerHandler: MouseEventHandler = (_event: MouseEvent<HTMLButtonElement>) => {
    fetch('/publish', {
        'method': 'POST',
        'headers': {
            'content-type': 'application/json',
        },
        'body': JSON.stringify({text: `${messageText} @ ${new Date().toISOString()}`})
    })
  }

  return (
    <>
      <div className="flex flex-col justify-start items-start gap-4 h-[138px]">
        <div className="font-manrope text-sm min-w-[113px] whitespace-nowrap text-black text-opacity-100 leading-4 uppercase tracking-widest font-medium">
          <span className="uppercase">Message text</span>
        </div>
        <input className="font-manrope px-3 rounded-md items-center text-base min-w-[720px] w-[752px] whitespace-nowrap text-zinc-800 text-opacity-100 leading-6 font-light h-12 border-zinc-300 border-solid border bg-neutral-100" value={messageText}  onChange={e => setMessageText(e.target.value)} />
        <div className="flex flex-row justify-start items-start gap-4 w-[368px]">
          <div className="flex justify-center items-center rounded-md w-44 h-10 bg-black">
            <div className="font-manrope text-base min-w-[136px] whitespace-nowrap text-white text-opacity-100 leading-4 font-medium">
              <button onClick={publicFromClientHandler}>Publish from Client</button>
            </div>
          </div>
          <div className="flex justify-center items-center rounded-md w-44 h-10 bg-black">
            <div className="font-manrope text-base min-w-[136px] whitespace-nowrap text-white text-opacity-100 leading-4 font-medium">
              <button onClick={publicFromServerHandler}>Publish from Server</button>
            </div>
          </div>
        </div>
      </div>
      <Logger logEntries={logs}  displayHeader={true}  />
      
    </>
  )
}
function TimerGroup() {
  const [playActive] = useSound("/sounds/switch-on.mp3", { volume: 1 });
  const { channel, ably } = useChannel("timer-group", (message:any) => {
    if (message.data.action === "run") {
      document.querySelectorAll(".start-button").forEach((el) => (el as HTMLElement).click());
    }
    if (message.data.action === "reset") {
      document.querySelectorAll(".reset-button").forEach((el) => (el as HTMLElement).click());
    }
  });
  return (
    <section className="timer-container">
      <div className="timer-wrap">
        <h2>Timer 1</h2>
        <Timer index={'1'}/>
      </div>
      <div className="timer-wrap">
        <h2>Timer 2</h2>
        <Timer index={'2'}/>
      </div>
      <div className="timer-wrap">
        <h2>Timer 3</h2>
        <Timer index={'3'}/>
      </div>
      <div className="main-group-button">
        <button
          onClick={() => {
            channel.publish({ name: "timer", data: { action: "run" } });
          }}
          onMouseDown={()=>{playActive()}}
        >
          START
        </button>
        <button
          onClick={() => {
            channel.publish({ name: "timer", data: { action: "reset" } });
          }}
          onMouseDown={()=>{playActive()}}
        >
          RESET
        </button>
      </div>
    </section>
  );
}

function Timer({index}:any) {
  const { channel, ably } = useChannel(`timer-${index}`, (message:any) => {
    if (message.data.action === "stop") {
      stop();
    }
    if (message.data.action === "resume") {
      resume();
    }
    if (message.data.action === "reset") {
      reset();
    }
  });
  const [time, setTime] = useState({ ms: 0, s: 0, m: 0, h: 0 });
  const [interv, setInterv] = useState<number>();
  const [status, setStatus] = useState(0);
  // Not started = 0
  // started = 1
  // stopped = 2

  const start = () => {
    run();
    setStatus(1);
    setInterv(setInterval(run, 10) as any);
  };

  var updatedMs = time.ms,
    updatedS = time.s,
    updatedM = time.m,
    updatedH = time.h;

  const run = () => {
    if (updatedM === 60) {
      updatedH++;
      updatedM = 0;
    }
    if (updatedS === 60) {
      updatedM++;
      updatedS = 0;
    }
    if (updatedMs === 100) {
      updatedS++;
      updatedMs = 0;
    }
    updatedMs++;
    return setTime({ ms: updatedMs, s: updatedS, m: updatedM, h: updatedH });
  };

  const stop = () => {
    clearInterval(interv);
    setStatus(2);
  };

  const reset = () => {
    clearInterval(interv);
    setStatus(0);
    setTime({ ms: 0, s: 0, m: 0, h: 0 });
  };

  const resume = () => start();

  return (
    <div className="main-section">
      <div className="clock-holder">
        <div className="stopwatch">
          <DisplayComponent time={time} />
          <BtnComponent
            status={status}
            stop={() => {
              channel.publish({ name: "timer", data: { action: "stop" } });
            }}
            start={start}
            resume={() => {
              channel.publish({ name: "timer", data: { action: "resume" } });
            }}
            reset={() => {
              channel.publish({ name: "timer", data: { action: "reset" } });
            }}
          />
        </div>
      </div>
    </div>
  );
}

import React from 'react';

function DisplayComponent(props:any) {
  const h = () => {
     if(props.time.h === 0){
       return '';
     }else {
       return <span>{(props.time.h >= 10)? props.time.h : "0"+ props.time.h}</span>;
     }
  }
  return (
    <div>
       {h()}&nbsp;&nbsp;
       <span>{(props.time.m >= 10)? props.time.m : "0"+ props.time.m}</span>&nbsp;<div className='separater'>:</div>&nbsp;
       <span>{(props.time.s >= 10)? props.time.s : "0"+ props.time.s}</span>&nbsp;<div className='separater'>:</div>&nbsp;
       <span>{(props.time.ms >= 10)? props.time.ms : "0"+ props.time.ms}</span>
    </div>
  );
}
function BtnComponent(props:any) {
  const [playActive] = useSound("/sounds/switch-on.mp3", { volume: 1 });
  return (
    <>
      {props.status === 0 ? (
        <button
          style={{opacity:0, height:0, overflow:"hidden", padding:0, margin:0}}
          className="stopwatch-btn stopwatch-btn-gre start-button"
          onClick={props.start}
          onMouseDown={()=>{playActive()}}
        >
        </button>
      ) : (
        ""
      )}

      {props.status === 1 ? (
        <div>
          <button
            className="stopwatch-btn stopwatch-btn-red"
            onClick={props.stop}
            onMouseDown={()=>{playActive()}}
          >
            Stop
          </button>
          <button
            className="stopwatch-btn stopwatch-btn-yel reset-button"
            onClick={props.reset}
            onMouseDown={()=>{playActive()}}
          >
            Reset
          </button>
        </div>
      ) : (
        ""
      )}

      {props.status === 2 ? (
        <div>
          <button
            className="stopwatch-btn stopwatch-btn-gre"
            onClick={props.resume}
            onMouseDown={()=>{playActive()}}
          >
            Resume
          </button>
          <button
            className="stopwatch-btn stopwatch-btn-yel reset-button"
            onClick={props.reset}
            onMouseDown={()=>{playActive()}}
          >
            Reset
          </button>
        </div>
      ) : (
        ""
      )}
    </>
  );
}


