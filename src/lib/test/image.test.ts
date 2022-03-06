import { expect, test } from 'vitest';
import { builder as create_builder } from '../image';

const test_asset = {
	_ref: 'image-6ac29c68b72cfcfe03fdb0753d154f4b30190cc3-90x90-png',
	_type: 'reference'
};
const url_for = (src) => builder.image(src);

const builder = create_builder({
	projectId: 'abcdefgh',
	dataset: 'development'
});

test('ratio', () => {
	expect(url_for(test_asset).ratio()).toBe(`1 / 1`);
});

test('srcset', () => {
	expect(url_for(test_asset).srcset([100, 200, 300])).toMatchSnapshot();
});

test('sizes', () => {
	expect(url_for(test_asset).sizes().if({ maxWidth: 600 }).then(480).else(800)).toMatchSnapshot();
});
