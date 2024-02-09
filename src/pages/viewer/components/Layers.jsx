import { useContext, useMemo, useState } from "react";
import { Tree } from 'react-arborist';
import MapContext from "../map";
import LegendSymbol from "./LegendSymbol";

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

function Layer({ node, style, dragHandle }) {
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
      return layer ? LegendSymbol(layer, map) : LegendSymbol(lazy.layers[node.data.id], map);
    } catch(e) {
      console.log(e);
      return null;
    }
  }, [layer, lazy])

  return (
    <div style={style} ref={dragHandle}>
      <div className="row">
        <div className="row grow group" onClick={updateVisibility}>
          <i className={icon}></i>
          <div className="legend">{legend}</div>
          <div className="text-truncate">{node.data.name}</div>
        </div>
        {node.data.download && (<div><a href={node.data.download} download><i className="fas fa-download"></i></a></div>)}
      </div>
    </div>
  );
}

function Group({ node, style, dragHandle }) {
  return (
    <div style={style} ref={dragHandle}>
      <div className="row" >
        <div className="row grow group" onClick={() => node.toggle()}>
          <i className={`fas fa-folder${node.isOpen ? '-open' : '' }`}></i>
          <span className="text-truncate">{node.data.name}</span>
        </div>
        {node.data.download && (<div><a href={node.data.download} download><i className="fas fa-download"></i></a></div>)}
      </div>
    </div>
  );
}

function Child({ node, ...other }) {
  let Component = Group
  if (node.isLeaf) {
    Component = Layer
  }

  return <Component node={node} {...other} />
}

const options = {
  box: "border-box"
}

const ROW_HEIGHT = 30;

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
      <div>
        <h5>Kartlag</h5>
      </div>
      <Tree
        initialData={layers}
        disableEdit
        disableDrag
        disableDrop
        disableMultiSelection
        openByDefault={false}
        height={count * ROW_HEIGHT}
        indent={10}
        width={400}
        rowHeight={ROW_HEIGHT}
        overscanCount={1}
        ref={ref}
      >
        {Child}
      </Tree>
    </div>
  )
}