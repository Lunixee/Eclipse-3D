import {normalizeName} from '../../util/number.js';

// Registration and dispatch share the same explicit, module-time allowlist.
// No arbitrary object paths, reflected methods, resources or caches are created.
export const propertyFamily = (opcode, type, text, resource, select, properties) => Object.freeze({
    opcode, type, text, resource, select, properties: Object.freeze(properties),
    menu: `${opcode}Property`
});

export const familyMenus = families => Object.fromEntries(families.map(family => [family.menu, {
    acceptReporters: true, items: Object.keys(family.properties)
}]));

export const familyBlocks = (Scratch, families) => families.map(family => ({
    opcode: family.opcode,
    text: family.text,
    blockType: family.type === 'command' ? Scratch.BlockType.COMMAND :
        family.type === 'boolean' ? Scratch.BlockType.BOOLEAN : Scratch.BlockType.REPORTER,
    arguments: {
        ...(family.resource ? {[family.resource.argument]: {
            type: Scratch.ArgumentType.STRING, defaultValue: family.resource.defaultValue
        }} : {}),
        PROPERTY: {type: Scratch.ArgumentType.STRING, menu: family.menu, defaultValue: Object.keys(family.properties)[0]},
        ...(family.type === 'command' ? {VALUE: {type: Scratch.ArgumentType.NUMBER, defaultValue: 1}} : {})
    }
}));

export const apiNumber = value => {
    const number = Number(value);
    if (!Number.isFinite(number) || !Number.isFinite(Math.fround(number))) throw new Error('Expected a finite float32 number');
    return number;
};

export const runPropertyFamily = (engine, family, name, property, value = undefined) => {
    const key = String(property ?? '').trim().toLowerCase();
    if (!Object.hasOwn(family.properties, key)) throw new Error(`Unknown ${family.opcode} property "${property}"`);
    const normalized = normalizeName(name);
    if (family.resource && !normalized) throw new Error(`${family.resource.argument} name cannot be empty`);
    const resource = family.select(engine, normalized);
    const operation = family.properties[key];
    if (family.type === 'command') return operation(resource, engine, apiNumber(value));
    const result = operation(resource, engine);
    if (typeof result !== family.type || (family.type === 'number' && !Number.isFinite(result))) {
        throw new Error(`Invalid ${family.type} result for ${family.opcode}.${key}`);
    }
    return result;
};
