import { ErrorComponent, Route } from "@tanstack/react-router";
import parse from 'html-react-parser';
import rootRoute from "../root";
import Layers from "./components/Layers";
import Map from "./components/Map";
import MapContextProvider from "./components/MapContextProvider";
import Metadata from "./components/Metadata";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import mapApi from "../../api";
import { NotFoundError } from "../../lib/utils";
import { Content, Tabs } from "react-bulma-components";
import { useMemo, useState } from "react";
import { Helmet } from "react-helmet";
import ModalContextProvider from "./components/ModalContextProvider";
import Lazy from "./components/Lazy";

const fetchMap = async () => {
  const map = await mapApi
    .get(window.METADATA_URL)

  if (!map) {
    throw new NotFoundError(`Map not found!`)
  }

  return map
}


const mapQueryOptions = queryOptions({
    queryKey: ['maps'],
    queryFn: fetchMap,
  })


export const viewerRoute = new Route({
  component: Viewer,
  path: '/',
  getParentRoute: () => rootRoute,
  errorComponent: MapErrorComponent,
  loader: ({ context: { queryClient }}) =>
    queryClient.ensureQueryData(mapQueryOptions),
})


function MapErrorComponent({ error }) {
  if (error instanceof NotFoundError) {
    return <div>{error.message}</div>
  }

  return <ErrorComponent error={error} />
}

const TABS = {
  kartlag: {
    label: 'Kartlag',
    render: (map) => <Layers layers={map.data.layers} />,
  },
  beskrivelse: {
    label: 'Beskrivelse',
    render: (map) => (
    <Content px={2}>
      {parse(map.data.description)}
    </Content>
    )
  }
}

function TabNav({ map }) {
  const [active, setActive] = useState('kartlag');

  const render = useMemo(() => TABS[active].render(map), [active, map]);

  return (
    <>
      <Tabs fullwidth mt={3}>
        {Object.keys(TABS).map(k => (
          <Tabs.Tab active={k === active} key={k} onClick={() => setActive(k)}>
            {TABS[k].label}
          </Tabs.Tab>
        ))}
      </Tabs>
      {render}
    </>
  )
}

export function Viewer() {
  const mapQuery = useSuspenseQuery(mapQueryOptions);
  const map = mapQuery.data;

  console.log(map);

  return (
    <MapContextProvider>
      <ModalContextProvider>
        <Helmet 
          title={map.data.title}
        />
        <div id="app-wrap" style={{ display: 'flex' }}>
          <div id="sidebar">
            <Metadata {...map.data} />
            <Lazy lazy={map.data.lazy} />
            <TabNav map={map} />
          </div>
          <Map {...map.data} />
        </div>
      </ModalContextProvider>
    </MapContextProvider>
  );
}
