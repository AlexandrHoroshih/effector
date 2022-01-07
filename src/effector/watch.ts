import {run} from './step'
import {callStack} from './caller'
import {createNode} from './createNode'
import {Subscription, NodeUnit, Node} from './index.h'
import {createSubscription} from './subscription'
import {assert} from './throw'
import {isFunction} from './is'
import { getGraph } from './getter'

export const watchUnit = (
  unit: NodeUnit,
  handler: (payload) => any,
): Subscription => {
  assert(isFunction(handler), '.watch argument should be a function')
  return createSubscription(
    createNode({
      scope: {fn: handler},
      node: [run({fn: callStack})],
      parent: unit,
      hot: true,
      meta: {op: 'watch'},
      family: {owners: unit},
      regional: true,
    }),
  )
}

export const incWatchers = (node: NodeUnit, up = 1) => {
  const target = getGraph(node)
  target.watchersCount = (target.watchersCount ?? 0) + up
}

export const decWatchers = (node: NodeUnit, down = 1) => {
  const target = getGraph(node)
  const nextValue = (target.watchersCount ?? 0) - down
  target.watchersCount = nextValue >= 0 ? nextValue : 0;
}

export const setHot = (node: Node) => (node.hot = true)

const goUp = (node: NodeUnit, cb: (t: Node) => void) => {
  const target = getGraph(node)
  const queue = target.prev.slice()
  while (queue.length) {
    const current = queue.shift()
    if (!current) break;
    cb(current);
    if (current.prev.length) {
      queue.push(...current.prev)
    }
  }
} 

export const heatUp = (node: NodeUnit) => {
  const target = getGraph(node);

  if (target.hot) {
    goUp(target, t => incWatchers(t))
  } else if (target.watchersCount) {
    goUp(target, t => incWatchers(t, target.watchersCount))
  }
}

export const coolDown = (node: NodeUnit) => {
  const target = getGraph(node)

  if (target.hot) {
    goUp(target, t => decWatchers(t))
  } else if (target.watchersCount) {
    goUp(target, t => decWatchers(t, target.watchersCount))
  }
}
