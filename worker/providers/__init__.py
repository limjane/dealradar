"""Provider adapters (foundation §2 rule): all external data calls go through here.

One capability = one interface. `PriceSource` is the only one at MVP; a `DeepLinkBuilder`
lands with task 5. Swapping providers must touch only this package — that rule is what let
the Amadeus→Travelpayouts pivot (D10) stay contained.
"""

from providers.base import MonthPrice, PriceSource
from providers.travelpayouts import TravelpayoutsPriceSource

__all__ = ["MonthPrice", "PriceSource", "TravelpayoutsPriceSource"]
