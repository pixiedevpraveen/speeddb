export class SDBError<N extends SDBErrorType> extends Error {
    name: `${SDBErrorType}Error`
    constructor(name: N, msg?: string) {
        super(msg)
        this.name = `${name}Error`
    }
}

export function invalidName(created?: boolean) {
    throw new SDBError('Property', 'Collection must have a name property to be ' + created ? 'created' : 'loaded')
}

type SDBErrorType = "Property" | "Value" | "Type" | "Event"
