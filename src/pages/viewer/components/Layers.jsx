import { useContext, useMemo, useState } from "react";
import { Tree } from 'react-arborist';
import { MapContext, ModalContext } from "../contexts";
import LegendSymbol from "./LegendSymbol";
import { Button } from "react-bulma-components";

function toBoundsString(tile, map) {
  let bounds = map.getBounds().toArray()
  return tile.replace('{bbox}', [
    ...bounds[0], ...bounds[1]
  ].join(',')).replace('{zoom}', Math.round(map.getZoom()))
}

function tileUpdater(sourceId, baseTile) {
  return (e) => {
    const map = e.target;
    let t = toBoundsString(baseTile, map);
    map.getSource(sourceId).setTiles([t]);
  }
}

function Layer({ node }) {
  const { map, layers, lazy } = useContext(MapContext);
  const layer = layers[node.data.id];

  const icon = layer && layer.isVisible ? 'fas fa-eye' : 'fas fa-eye-slash';

  const updateVisibility = () => {
    if (layer) {
      map.setLayoutProperty(node.data.id, 'visibility', layer.isVisible ? 'none' : 'visible');
    } else {
      const original_tile = lazy.layers[node.data.id].source.tiles[0];
      const { dependsOnBBox = false } = lazy.layers[node.data.id];
      if (dependsOnBBox) {
        let t = toBoundsString(original_tile, map);
        lazy.layers[node.data.id].source.tiles[0] = t;
      }
      map.addLayer(lazy.layers[node.data.id]);
      if (dependsOnBBox) {
        const tileUpdaterFn = tileUpdater(node.data.id, original_tile);
        map.on('moveend', tileUpdaterFn);
        map.on('zoomend', tileUpdaterFn);
      }
    }
  }

  const legend = useMemo(() => {
    try {
      if (layer) {
        return LegendSymbol(layer, map);
      } else if (lazy.layers && lazy.layers[node.data.id]) {
        return LegendSymbol(lazy.layers[node.data.id], map)
      }
      return null;
    } catch(e) {
      console.log(layer, lazy.layers, node.data.id);
      console.log(e);
      return null;
    }
  }, [layer, lazy])

  return (
    <div onClick={updateVisibility} style={{ flexGrow: 1, display: 'flex', alignItems: 'center' }}>
      <i className={icon}></i>
      <div style={{ width: '17px', height: '17px', margin: '0 0.5rem' }}>{legend}</div>
      <div>{node.data.name}</div>
    </div>  
  );
}

function Group({ node }) {
  return (
    <div onClick={() => node.toggle()} style={{ flexGrow: 1 }}><i className={`fas fa-folder${node.isOpen ? '-open' : '' }`}></i> {node.data.name}</div>
  );
}

function Child({ node, dragHandle, style }) {
  const openNodeDescription = useContext(ModalContext);

  let Component = Group
  if (node.isLeaf) {
    Component = Layer
  }

  return (
    <div style={style} ref={dragHandle}>
      <div style={{ display: 'flex' }}>
        <Component node={node} />
        <div style={{ display: 'flex' }}>
          {node.data.description && (<Button size="small" text onClick={() => openNodeDescription(node.data)}><i className="fas fa-info"></i></Button>)}
          {node.data.link && (<Button size="small" renderAs="a" text href={node.data.link} target="_blank"><i className="fas fa-info"></i></Button>)}
          {node.data.download && (<Button size="small" text renderAs="a" href={node.data.download} download><i className="fas fa-download"></i></Button>)}
        </div>
      </div>
    </div>
  );
}

const options = {
  box: "border-box"
}

const ROW_HEIGHT = 30;
const SIDEBAR_WIDTH = 400 - 16; // 400 - 8px padding per side

function useTreeVisibleNodesCount() {
  const [count, setCount] = useState(0)
  const ref = (api) => {
    if (api) setCount(api.visibleNodes.length)
  }
  return { ref, count }
}

export default function Layers({ layers = [] }) {
  const { count, ref } = useTreeVisibleNodesCount();

  return (
    <div className="layers">
      <Tree
        initialData={layers}
        disableEdit
        disableDrag
        disableDrop
        disableMultiSelection
        openByDefault
        height={count * ROW_HEIGHT}
        indent={10}
        rowHeight={ROW_HEIGHT}
        width={SIDEBAR_WIDTH}
        overscanCount={1}
        ref={ref}
      >
        {Child}
      </Tree>
    </div>
  )
}
