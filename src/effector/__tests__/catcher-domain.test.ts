import {Domain} from 'domain'
import {
  createDomain,
  sample,
  createStore,
  createEvent,
  createEffect,
} from 'effector'

const createDomainWithCatch = () => {
  const d = createDomain()
  const exceptionHappened = d.createEvent<any>()
  const runHandlerFx = d.createEffect((p: {fn: any; error: unknown}) =>
    p.fn(p.error),
  )
  const runAllHandlersFx = d.createEffect((p: {fns: any[]; error: unknown}) => {
    if (!p.error) return
    p.fns.forEach(fn => {
      runHandlerFx({fn, error: p.error})
    })
  })
  const handlers: any[] = []
  const addFn = (fn: any) => handlers.push(fn)
  const removeFn = (fn: any) => {
    const i = handlers.findIndex(f => f === fn)
    if (i > -1) {
      handlers.splice(i, 1)
    }
  }
  sample({
    clock: exceptionHappened,
    fn: error => ({fns: handlers, error}),
    target: runAllHandlersFx,
  })
  const onUnexpectedError = (fn: any) => {
    addFn(fn)
    return () => removeFn(fn)
  }
  // @ts-expect-error
  const internalCreateStore = (...args) => {
    // @ts-expect-error
    const $store = d.createStore(...args)

    ;($store as any).graphite.catcher = exceptionHappened

    return $store
  }

  return {
    ...d,
    createStore: internalCreateStore as typeof d.createStore,
    createEvent: d.createEvent,
    createEffect: d.createEffect,
    onUnexpectedError,
  }
}

it('catches unexpected errors', () => {
  // some common app code
  const start = createEvent<number>()
  const $store = createStore(0)

  sample({
    clock: sample({
      source: $store,
      clock: start,
      fn: (_, n) => {
        // fake computation error
        if (n === 2) {
          throw new Error("Oh-oh, didn't work with 2")
        }
        return n
      },
    }),
    fn: v => v,
    target: $store,
  })

  // feature specific code
  const featureD = createDomainWithCatch()

  const errored = jest.fn()
  featureD.onUnexpectedError(errored)

  const $feature = featureD.createStore(0)
  const featureFx = featureD.createEffect((v: any) => v)

  $feature.on(featureFx.doneData, (_, v) => v)

  sample({
    clock: $store,
    target: featureFx,
  })

  start(1)
  start(2)
  start(3)
  start(4)

  expect($feature.getState()).toEqual(4)
  expect(errored.mock.calls).toMatchInlineSnapshot(`
    Array [
      Array [
        [Error: Oh-oh, didn't work with 2],
      ],
    ]
  `)
})
