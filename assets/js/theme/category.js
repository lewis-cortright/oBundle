import { hooks } from '@bigcommerce/stencil-utils';
import utils from '@bigcommerce/stencil-utils';
import CatalogPage from './catalog';
import compareProducts from './global/compare-products';
import FacetedSearch from './common/faceted-search';
import { createTranslationDictionary } from '../theme/common/utils/translations-utils';

export default class Category extends CatalogPage {
    constructor(context) {
        super(context);
        $('.alertBox--info').hide();
        $('.alertBox--success').hide();
        this.validationDictionary = createTranslationDictionary(context);
    }

    setLiveRegionAttributes($element, roleType, ariaLiveStatus) {
        $element.attr({
            role: roleType,
            'aria-live': ariaLiveStatus,
        });
    }

    makeShopByPriceFilterAccessible() {
        if (!$('[data-shop-by-price]').length) return;

        if ($('.navList-action').hasClass('is-active')) {
            $('a.navList-action.is-active').focus();
        }

        $('a.navList-action').on('click', () => this.setLiveRegionAttributes($('span.price-filter-message'), 'status', 'assertive'));
    }

    onReady() {
        this.arrangeFocusOnSortBy();

        $('[data-button-type="add-cart"]').on('click', (e) => this.setLiveRegionAttributes($(e.currentTarget).next(), 'status', 'polite'));

        this.makeShopByPriceFilterAccessible();

        compareProducts(this.context.urls);

        if ($('#facetedSearch').length > 0) {
            this.initFacetedSearch();
        } else {
            this.onSortBySubmit = this.onSortBySubmit.bind(this);
            hooks.on('sortBy-submitted', this.onSortBySubmit);
        }

        $('a.reset-btn').on('click', () => this.setLiveRegionsAttributes($('span.reset-message'), 'status', 'polite'));

        this.ariaNotifyNoProducts();

        let cartId = '';
        let cartItemId = '';
        $('#add-special').on('click', (e) => {
            /*
             This is not very dynamic but I couldn't figure out how to access the product.id from the html
            */
            const cartUrl = `/cart.php?action=add&product_id=${e.target.getAttribute('data-product')}`;
            const getCartUrl = 'http://localhost:3000/api/storefront/carts';
            let cartId = '';
            let cartItemId = '';
            let cartItems = {
                'lineItems': [
                    {
                        'quantity': 1,
                        productId: e.target.getAttribute('data-product')
                    }
                ]
            };
            this.createCart(cartUrl, cartItems)
                .then((data) => {
                    $('.alertBox--success').show().delay(1000).hide(1500);
                    console.log(data);
                }).then(() => {
                utils.api.cart.getCart({}, (err, response) => {
                    console.log(response);
                    console.log(response.lineItems.physicalItems[0].id);
                    cartId = response.id;
                    cartItemId = response.lineItems.physicalItems[0].id;
                    $('#delete-all').show();
                    $('#delete-all').on('click', (e) => {
                        console.log('cartId: ', cartId);
                        console.log('cartIdItemId: ', cartItemId);
                        $('.alertBox--info').show().delay(1000).hide(1500);
                        $('#delete-all').hide();
                        this.deleteItem('/api/storefront/carts/', cartId, cartItemId)
                            .then(r => {
                                console.log(r);
                            })
                    });
                });
            });
        });
    }

    deleteItem(url, cartId, itemId) {
        return fetch(`${url}${cartId}/items/${itemId}`, {
            method: 'DELETE',
            credentials: 'same-origin',
            headers: {
                'Content-Type': 'application/json'
            }
        })
            .then(x => x.json());
    }

    createCart(url, cartItems) {
        return fetch(url, {
            method: 'POST',
            credentials: 'same-origin',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(cartItems),
        })
            .then(response => console.log(response))
            .catch(err => console.log(err));
    };

    getCart(url) {
        return fetch(url, {
            method: 'GET',
            credentials: 'same-origin'
        })
            .then(response => console.log(response));
    }

    ariaNotifyNoProducts() {
        const $noProductsMessage = $('[data-no-products-notification]');
        if ($noProductsMessage.length) {
            $noProductsMessage.focus();
        }
    }

    initFacetedSearch() {
        const {
            price_min_evaluation: onMinPriceError,
            price_max_evaluation: onMaxPriceError,
            price_min_not_entered: minPriceNotEntered,
            price_max_not_entered: maxPriceNotEntered,
            price_invalid_value: onInvalidPrice,
        } = this.validationDictionary;
        const $productListingContainer = $('#product-listing-container');
        const $facetedSearchContainer = $('#faceted-search-container');
        const productsPerPage = this.context.categoryProductsPerPage;
        const requestOptions = {
            config: {
                category: {
                    shop_by_price: true,
                    products: {
                        limit: productsPerPage,
                    },
                },
            },
            template: {
                productListing: 'category/product-listing',
                sidebar: 'category/sidebar',
            },
            showMore: 'category/show-more',
        };

        this.facetedSearch = new FacetedSearch(requestOptions, (content) => {
            $productListingContainer.html(content.productListing);

            $facetedSearchContainer.html(content.sidebar);

            $('body').triggerHandler('compareReset');

            $('html, body').animate({
                scrollTop: 0,
            }, 100);
        }, {
            validationErrorMessages: {
                onMinPriceError,
                onMaxPriceError,
                minPriceNotEntered,
                maxPriceNotEntered,
                onInvalidPrice,
            },
        });
    }
}
