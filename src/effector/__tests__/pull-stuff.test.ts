import {createStore, createEvent, createEffect, sample, fork, launch} from "effector"

test("dry run works", () => {
    const changed = createEvent()
    const $a = createStore(0).on(changed, s => s + 1)
    const fx = createEffect(() => {})

    sample({
        clock: $a,
        target: fx
    })

    const trackFx = jest.fn()

    const scope = fork({
        handlers: [[fx, trackFx]]
    })

    // @ts-expect-error
    launch({
        target: changed,
        scope,
    })

    expect(scope.getState($a)).toEqual(1)
    expect(trackFx).toHaveBeenCalledTimes(1)

    // @ts-expect-error
    launch({
        target: changed,
        scope,
        dryRun: true,
    })

    expect(scope.getState($a)).toEqual(2)
    // state should be changed, but no side effects called
    expect(trackFx).toHaveBeenCalledTimes(1)
})
