/** Private built entry for the persistent Node REPL. */
import { openInheritedControlChannel } from '@singula-ai/alego-subprocess/control'
import { runPersistentMain } from './persistent-process.ts'

void runPersistentMain(openInheritedControlChannel(), Number(process.argv[2]), process)
