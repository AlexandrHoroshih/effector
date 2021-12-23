import {
  launch,
  createStore,
  createEvent,
  sample,
  Unit,
  restore,
  createEffect,
} from 'effector'

const catcher = (config: {target: Unit<unknown>}) => {
  const catched = createEvent<unknown>()
  ;(config.target as any).graphite.catcher = catched

  return restore(catched, null)
}

it('catches unexpected errors', () => {
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

  const $error = catcher({
    target: $store,
  })

  expect($error.getState()).toMatchInlineSnapshot(`null`)
  start(1)
  start(2)
  expect($error.getState()).toMatchInlineSnapshot(
    `[Error: Oh-oh, didn't work with 2]`,
  )
  start(3)
  start(4)

  expect($error.getState()).toMatchInlineSnapshot(`null`)
  expect($store.getState()).toEqual(4)
})

it('catches unexpected errors through effects', () => {
    const start = createEvent<number>()
    const $store = createStore(0)
    const eff = createEffect((v: number) => v)

    $store.on(eff.doneData, (_, n) => n)
  
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
      target: eff,
    })
  
    const $error = catcher({
      target: $store,
    })
  
    expect($error.getState()).toMatchInlineSnapshot(`null`)
    start(10)
    start(2)
    expect($error.getState()).toMatchInlineSnapshot(
      `[Error: Oh-oh, didn't work with 2]`,
    )
    start(3)
    start(4)
  
    expect($error.getState()).toMatchInlineSnapshot(`null`)
    expect($store.getState()).toEqual(4)
  })
  
