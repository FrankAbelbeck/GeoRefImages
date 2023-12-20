# GeoRefImages

Copyright (C) 2023 Frank Abelbeck <frank@abelbeck.info>

License: GLP 3

## Overview

The GeoRefImages Firefox addon adds a new item to all image context menus.

This item opens the image in a new tab and guides the user through a process
to geo-reference the image:

 1) The user is asked to select two points and specify the latitude and
    longitude of these points.
 2) The user may define a region of interest to crop the image.
 3) The user may add some masking areas to remove parts of the image.
 4) The user may download a modified and properly named version of the image.

The addon creates a filename tailored for usage with the Enroute Flight
Navigation app:

   unique_name-geo_lon0_lat0_lon1_lat1.png

The user can add these files to a zip file. When fed to Enroute, the images are
imported as visual approach charts and can be shown at the correct coordinates.

## Changelog

 * **2023-12-20** Initial release.
