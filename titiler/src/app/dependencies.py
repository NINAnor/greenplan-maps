"""dependencies.

app/dependencies.py

"""

from typing import List

import cv2

from titiler.core.algorithm import BaseAlgorithm
from rio_tiler.models import ImageData
from rio_tiler.io import Reader
from rasterio import windows



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
