export const CATEGORY_WEIGHTS = {
    desc: 0.3,
    name: 0.15,
    schema: 0.3,
    token: 0.15,
    consist: 0.1,
    prog: 0,
};
/** code-mode makes room for Programmability by scaling the classic weights down to 80%. */
export const CODE_MODE_WEIGHTS = {
    desc: 0.25,
    name: 0.1,
    schema: 0.25,
    token: 0.1,
    consist: 0.1,
    prog: 0.2,
};
export const SEVERITY_PENALTY = {
    error: 10,
    warn: 4,
    info: 1,
};
