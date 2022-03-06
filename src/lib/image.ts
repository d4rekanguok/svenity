import type {
	AutoMode,
	CropMode,
	FitMode,
	ImageFormat,
	ImageUrlBuilderOptionsWithAliases,
	Orientation,
	SanityClientLike,
	SanityImageSource,
	SanityProjectDetails
} from '@sanity/image-url/lib/types/types';
import type { ImageUrlBuilder } from '@sanity/image-url/lib/types/builder';

import sanityBuilder from '@sanity/image-url';

type Srcset = (arg: number[], descriptor?: 'x' | 'w') => string;

interface SvenityUrlBuilder extends ImageUrlBuilder {
	srcset: Srcset;
	sizes(): Sizes;
	ratio(): string;
	withOptions(options: Partial<ImageUrlBuilderOptionsWithAliases>): SvenityUrlBuilder;
	image(source: SanityImageSource): SvenityUrlBuilder;
	dataset(dataset: string): SvenityUrlBuilder;
	projectId(projectId: string): SvenityUrlBuilder;
	bg(bg: string): SvenityUrlBuilder;
	dpr(dpr: number): SvenityUrlBuilder;
	width(width: number): SvenityUrlBuilder;
	height(height: number): SvenityUrlBuilder;
	focalPoint(x: number, y: number): SvenityUrlBuilder;
	maxWidth(maxWidth: number): SvenityUrlBuilder;
	minWidth(minWidth: number): SvenityUrlBuilder;
	maxHeight(maxHeight: number): SvenityUrlBuilder;
	minHeight(minHeight: number): SvenityUrlBuilder;
	size(width: number, height: number): SvenityUrlBuilder;
	blur(blur: number): SvenityUrlBuilder;
	sharpen(sharpen: number): SvenityUrlBuilder;
	rect(left: number, top: number, width: number, height: number): SvenityUrlBuilder;
	format(format: ImageFormat): SvenityUrlBuilder;
	invert(invert: boolean): SvenityUrlBuilder;
	orientation(orientation: Orientation): SvenityUrlBuilder;
	quality(quality: number): SvenityUrlBuilder;
	forceDownload(download: boolean | string): SvenityUrlBuilder;
	flipHorizontal(): SvenityUrlBuilder;
	flipVertical(): SvenityUrlBuilder;
	ignoreImageParams(): SvenityUrlBuilder;
	fit(value: FitMode): SvenityUrlBuilder;
	crop(value: CropMode): SvenityUrlBuilder;
	saturation(saturation: number): SvenityUrlBuilder;
	auto(value: AutoMode): SvenityUrlBuilder;
	pad(pad: number): SvenityUrlBuilder;
}

export const parse_id = (id: string) => {
	const [, _, d] = id.split('-');
	const [w, h] = d.split('x').map(Number);

	if (!isFinite(w) || !isFinite(h)) {
		throw new Error(`The image's id seems wrong: ${id}`);
	}

	return {
		width: w,
		height: h
	};
};

export const get_id = (source) => {
	let _id;
	if (!source)
		throw new Error(
			`No source found. Did you forget to pass in a source first? i.e "urlFor(asset).ratio()"`
		);
	if (typeof source === 'string') {
		_id = source;
	}
	if (typeof source === 'object') {
		_id = source._ref || source._id;
	}
	if (_id === undefined) {
		throw new Error(`Can't identify _id`);
	}
	return _id;
};

function ratio() {
	const { source } = this.options;
	const id = get_id(source);
	const { width, height } = parse_id(id);
	return `${width / height} / 1`;
}

function srcset(arg: number[] = [], descriptor: 'x' | 'w' = 'w'): string {
	return arg.map((value) => `${this.width(value).url()} ${value}${descriptor}`).join(', ');
}

const cond_map = {
	minWidth: 'min-width',
	maxWidth: 'max-width'
};
type ConditionValue = number;
type ConditionMedia = { media: string; value: ConditionValue };

class Sizes {
	builder: SvenityUrlBuilder;
	conditions: Array<[ConditionMedia, ConditionValue]>;
	partial_cond: [ConditionMedia, ConditionValue];
	constructor(builder: SvenityUrlBuilder, conditions = []) {
		this.builder = builder;
		this.conditions = conditions;
	}
	if(cond) {
		if (!cond) {
			throw new Error('Expect a media condition i.e. `{ maxWidth: 600 }`');
		}
		const media = Object.keys(cond)[0];
		this.partial_cond = [
			{
				media,
				value: cond[media]
			},
			null
		];
		return this;
	}
	then(value: ConditionValue) {
		if (!this.partial_cond) {
			throw new Error('Expect `if()` to be followed by a `then()`');
		}
		this.partial_cond[1] = value;
		this.conditions.push(this.partial_cond);
		this.partial_cond = null;
		return this;
	}
	else(value: ConditionValue) {
		if (this.partial_cond) {
			throw new Error('Expect `else()` to be followed by a pair of `if().then()`');
		}
		this.conditions.push([{ media: 'default', value: null }, value]);
		return this.serialize();
	}
	serialize() {
		const values = this.conditions.flatMap(([_, value]) => [value, value * 2]);
		const sizes = this.conditions
			.map(([{ media, value }, img_value]) => {
				if (media === 'default') return `${img_value}px`;
				return `(${cond_map[media]}:${value}px) ${img_value}px`;
			})
			.join(', ');
		return {
			sizes,
			srcset: this.builder.srcset(values)
		};
	}
}

function sizes() {
	return new Sizes(this, []);
}

export const builder = (options?: SanityClientLike | SanityProjectDetails): SvenityUrlBuilder => {
	const urlFor = sanityBuilder(options);

	const handler = {
		get: function (target, prop, receiver) {
			if (prop === 'srcset') {
				return srcset.bind(target);
			}
			if (prop === 'ratio') {
				return ratio.bind(target);
			}
			if (prop === 'sizes') {
				return sizes.bind(receiver);
			}
			return function (...args) {
				const result = Reflect.apply(target[prop], target, args);
				return new Proxy(result, handler);
			};
		}
	};

	return new Proxy(urlFor, handler);
};
