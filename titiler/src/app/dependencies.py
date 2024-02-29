"""dependencies.

app/dependencies.py

"""

from typing import List, Callable

import numpy as np
import os

from titiler.core.algorithm import BaseAlgorithm
from rio_tiler.models import ImageData
from rio_tiler.io import Reader

from titiler.core.algorithm import algorithms as default_algorithms
from titiler.core.algorithm import Algorithms
import walrus

db = walrus.Database(
    host=os.getenv("REDIS_HOST", "localhost"), port=int(os.getenv("REDIS_PORT", 6379))
)
cache = db.cache()
CACHE_TIMEOUT = int(os.getenv("BBOX_CACHE_TIMEOUT", 60))
BBOX_SCALE = int(os.getenv("BBOX_SCALE", 6))


@cache.cached(timeout=CACHE_TIMEOUT)
def get_stats_by_bbox(url, bbox):
    with Reader(url) as dst:
        cov = dst.part(bbox)
        cov_stats = cov.statistics()
        bs = cov_stats.get('b1')
        return ((bs.min, bs.max),)


class BBoxStats(BaseAlgorithm):
    input_nbands: int = 1
    output_nbands: int = 1
    output_dtype: str = "uint8"

    bbox: List[float]
    scale: int = 1

    def __call__(self, img: ImageData) -> ImageData:
        # compute the mask, find all the nan values
        mask = np.isnan(img.data)[0]
        # generate an array mask, with 0 and 255
        modified_mask = np.where(mask, 255, 0)
        
        if self.scale > BBOX_SCALE:
            stats = get_stats_by_bbox(img.assets[0], self.bbox)
        else:
            stats = img.dataset_statistics

        img.rescale(
            in_range=stats,
            out_range=((0, 255),)
        )
        data = np.where(~mask, img.data, 0)
        masked_array = np.ma.MaskedArray(data, mask=modified_mask)

        return ImageData(
            masked_array,
            assets=img.assets,
            crs=img.crs,
            bounds=img.bounds,
        )


algorithms: Algorithms = default_algorithms.register({
    "bboxstats": BBoxStats,
})
PostProcessParams: Callable = algorithms.dependency
