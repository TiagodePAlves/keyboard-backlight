import { unwrap } from '../utils/types/nonnull.js'
import { Objects } from '../utils/types/objects.js'

import { XSet } from './xset.js'

/** Matches one or more whitespace characters. */
const SPACE_RE = /\s+/g

/**
 * Turn all whitespace between words into a single space `' '` and removes spaces before the first word and after the
 * last. This function never returns the empty string, instead it throws and error if only whitespaces are present,
 * indicating that the input is malformed.
 *
 * @param text String to be normalized.
 * @returns Normalized {@link text}.
 */
function normalizeWhitespace(text: string): string {
    const result = text.split(SPACE_RE)
        .filter((word) => word.length > 0)
        .join(' ')

    if (result.length <= 0) {
        throw Error(`empty result for "${text}"`)
    }
    return result
}

/**
 * Parses a normalized version of {@link text} as {@link BigInt}.
 *
 * @param text Text to be parsed.
 * @returns
 *
 * @see {@link normalizeWhitespace}
 */
function parseBigInt(text: string): bigint {
    return BigInt(normalizeWhitespace(text))
}

/** Represents a key status update. */
export interface Status {
    /** The key name, following {@link XSet} namings. */
    readonly name: string
    /** The key id, from {@link XSet.query}. */
    readonly id: bigint
    /** Parsed state from {@link XSet.query}. */
    readonly state: 'on' | 'off'
}

/** Regex matching a a key from {@link XSet.query} output. */
const STATUS_RE = /(?<id>\d+):\s+(?<name>(\w+\s+)*\w+):\s+(?<status>on|off)/g

export namespace Status {
    /** Creates a frozen {@link Status} object with a null prototype. */
    function create(name: string, id: bigint, state: 'on' | 'off'): Status {
        return Objects.create({
            name: {
                value: name,
                enumerable: true,
                writable: false,
                configurable: false,
            },
            id: {
                value: id,
                enumerable: true,
                writable: false,
                configurable: false,
            },
            state: {
                value: state,
                enumerable: true,
                writable: false,
                configurable: false,
            }
        })
    }

    /**
     * Parse output from {@link XSet.query}.
     *
     * @param text Output from `xset q`.
     * @returns Parsed key statuses from `text`.
     */
    function *parse(text: string): Iterable<Status> {
        for (const { groups } of text.matchAll(STATUS_RE)) {
            const name = normalizeWhitespace(unwrap(groups?.['name']))
            const id =  parseBigInt(unwrap(groups?.['id']))
            const state = (unwrap(groups?.['status']) === 'on') ? 'on' : 'off'

            yield create(name, id, state)
        }
    }

    /**
     * Query and parse key {@link Status} from {@link XSet.query}.
     *
     * @returns All the key parsed with their respective statues.
     */
    export async function queryAll(): Promise<Map<string, Status>> {
        const data = new Map<string, Status>()
        for (const status of parse(await XSet.query())) {
            data.set(status.name, status)
        }
        return data
    }

    /**
     * Query and parse a single key {@link Status} from {@link XSet.query}.
     *
     * @returns The key status, if found.
     */
    export async function query(key: string): Promise<Status | undefined> {
        for (const status of parse(await XSet.query())) {
            if (status.name === key) {
                return status
            }
        }
        return undefined
    }
}
