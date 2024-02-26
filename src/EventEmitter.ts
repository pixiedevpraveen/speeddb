import { hasOwn, isArray } from "./utils"
import { SDBError } from "./error"
import { remove } from "@antfu/utils";

type EventHandlers<E extends string> = Record<E, any>
type EventFn<E extends keyof D, D> = ((event: E, data: D[E]) => void)


export class EventEmitter<E extends string, EventCol extends EventHandlers<E>> {
    events: Record<E, EventFn<E, EventCol>[]>

    constructor(events: readonly E[]) {
        this.events = {} as typeof this.events
        if (!isArray<E>(events)) throw new SDBError('Value', 'Events must be string array')

        events.forEach(e => {
            this.events[e] = []
        })
    }
    on<Ev extends E, Handler extends EventFn<Ev, EventCol>>(event: Ev | Ev[], fn: Handler) {
        if (!isArray(event))
            event = [event]

        event.forEach(ev => {
            // does have the property
            if (!hasOwn(this.events, ev))
                throw new SDBError("Event", "Event not available")

            this.events[ev].push(fn as any)
        })
        return fn
    }
    off<Ev extends E, Handler extends EventFn<Ev, EventCol>>(event: Ev | Ev[], fn: Handler) {
        if (!isArray(event))
            event = [event]

        event.forEach(ev => {
            var fns = this.events[ev];
            // below remove function will find index and remove it
            if (fns) remove(fns, fn as any);
        })
    }
    clearAllEvents() {
        Object.keys(this.events).forEach(ev => {
            if (hasOwn(this.events, ev))
                this.events[ev as E] = []
        })
    }

    emit<Ev extends E, Data extends EventCol[Ev]>(event: Ev, arg: Data) {
        if (!hasOwn(this.events, event)) return
        let len = this.events[event].length
        for (let i = 0; i < len; i++) {
            this.events[event][i](event, arg)
        }
    }
}
