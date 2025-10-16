export interface Recipe {
    name: string;
    description: string;
    useCase: string;
    topology: string;
    tags: string[];
}
export declare const RECIPES: Recipe[];
export declare function listRecipes(): void;
export declare function showRecipe(name: string): void;
//# sourceMappingURL=recipes.d.ts.map