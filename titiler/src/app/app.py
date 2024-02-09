# app.py
from typing import Callable
from titiler.extensions import cogViewerExtension, cogValidateExtension
from titiler.core.errors import DEFAULT_STATUS_CODES, add_exception_handlers
from titiler.core.algorithm import algorithms as default_algorithms
from titiler.core.algorithm import Algorithms

from fastapi import FastAPI

from .dependencies import StravaHeatmap, BBoxStats
from titiler.core.factory import TilerFactory

algorithms: Algorithms = default_algorithms.register({"stravaheatmap": StravaHeatmap, "bboxstats": BBoxStats})
PostProcessParams: Callable = algorithms.dependency

app = FastAPI(root_path="/tiler")
cog = TilerFactory(
    # colormap_dependency=ColorMapParams,
    process_dependency=PostProcessParams,
    extensions=[
        cogViewerExtension(),
        cogValidateExtension(),
    ])
app.include_router(cog.router)
add_exception_handlers(app, DEFAULT_STATUS_CODES)
