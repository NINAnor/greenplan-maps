# BBox colorscale map
experimental maplibre map with dynamic colormap based on bbox
also experimenting strava heatmap implmentation https://medium.com/strava-engineering/the-global-heatmap-now-6x-hotter-23fc01d301de


## Running the webapp

The only requirement is having a web server which supports HTTP bytes serving/ranged requests, such as NGINX.

### Development

```bash
docker compose --profile dev up --build
```

Then, the application can be seen by visiting [http://localhost:8000/](http://localhost:8000/).

### Production

Same as development, but using the `prod` profile:

```bash
docker compose --profile prod up
```
