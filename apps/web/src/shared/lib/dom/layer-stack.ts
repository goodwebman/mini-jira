export interface LayerStack {
  push: () => symbol;
  remove: (layer: symbol) => void;
  isTop: (layer: symbol) => boolean;
}

/**
 * Стек открытых слоёв. Нужен, чтобы при вложенных оверлеях реагировал только верхний:
 * Escape закрывает верхнюю модалку, а не все сразу; Tab удерживается в верхней.
 */
export function createLayerStack(): LayerStack {
  const layers: symbol[] = [];

  return {
    push: () => {
      const layer = Symbol('layer');
      layers.push(layer);
      return layer;
    },
    remove: (layer) => {
      const index = layers.indexOf(layer);
      if (index !== -1) {
        layers.splice(index, 1);
      }
    },
    isTop: (layer) => layers[layers.length - 1] === layer,
  };
}
