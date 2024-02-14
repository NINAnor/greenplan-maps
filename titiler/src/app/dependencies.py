"""dependencies.

app/dependencies.py

"""

from typing import List, Callable

import cv2
import numpy as np

from titiler.core.algorithm import BaseAlgorithm
from rio_tiler.models import ImageData
from rio_tiler.io import Reader
from rasterio import windows

from titiler.core.algorithm import algorithms as default_algorithms
from titiler.core.algorithm import Algorithms


class StravaHeatmap(BaseAlgorithm):
    '''
    requires that the layer sets the buffer parameter &buffer=x
    '''
    input_nbands: int = 1
    output_nbands: int = 1
    output_dtype: str = "uint8"

    buffer: int = 512
    tilesize: int = 256

    def __call__(self, img: ImageData) -> ImageData:
        stats = img.statistics()
        bs = stats.get('b1')
        bstats = (bs.min, bs.max)
        
        img.rescale(
            in_range=(bstats,),
            out_range=((0, 255),)
        )
        eq_img = cv2.equalizeHist(img.data_as_image())
        bounds = windows.bounds(windows.Window(self.tilesize, self.tilesize, self.tilesize, self.tilesize), img.transform)
        img = img.clip(bounds)
        return ImageData(
            eq_img[self.buffer:self.buffer+self.tilesize, self.buffer:self.buffer+self.tilesize],
            assets=img.assets,
            crs=img.crs,
            bounds=img.bounds,
        )

class StravaCLAHE(BaseAlgorithm):
    '''
    requires that the layer sets the buffer parameter &buffer=x
    '''
    input_nbands: int = 1
    output_nbands: int = 1
    output_dtype: str = "uint8"

    buffer: int = 512
    tilesize: int = 256
    def __call__(self, img: ImageData) -> ImageData:
        data = img.data_as_image()
        data = cv2.normalize(src=data, dst=None, alpha=0, beta=2**8, norm_type=cv2.NORM_MINMAX, dtype=cv2.CV_8U)
        clahe = cv2.createCLAHE(clipLimit=1, tileGridSize=(3, 3))
        eq_img = clahe.apply(data)
        pos_start, pos_end = self.buffer, self.buffer+self.tilesize
        masked_data = np.ma.MaskedArray(eq_img[pos_start:pos_end, pos_start:pos_end], mask=img.mask)
        return ImageData(
            masked_data,
            assets=img.assets,
            crs=img.crs,
            bounds=img.bounds,
        )

# TODO: use a caching system
ASSETS = {}

class BBoxStats(BaseAlgorithm):
    input_nbands: int = 1
    output_nbands: int = 1
    output_dtype: str = "uint8"

    bbox: List[float]
    scale: int = 1

    def __call__(self, img: ImageData) -> ImageData:
        if self.scale > 8:
            index = img.assets[0] + ','.join([str(v) for v in self.bbox])
            if index in ASSETS:
                bstats = ASSETS[index]
            else:
                with Reader(img.assets[0]) as dst:
                    cov = dst.part(self.bbox)
                    stats = cov.statistics()
                    bs = stats.get('b1')
                    bstats = ((bs.min, bs.max),)
                    ASSETS[index] = bstats

            img.rescale(
                in_range=bstats,
                out_range=((0, 255),)
            )
        else:
            stats = img.dataset_statistics
            img.rescale(
                in_range=stats,
                out_range=((0, 255),)
            )
        return img


algorithms: Algorithms = default_algorithms.register({
    "stravaheatmap": StravaHeatmap, 
    "bboxstats": BBoxStats,
    "stravaclahe": StravaCLAHE,
})
PostProcessParams: Callable = algorithms.dependency
