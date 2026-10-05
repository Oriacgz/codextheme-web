import { themeCategories } from "../services/theme-categories";
export default function CategoryPicker({ selected = [] }) {
  return (
    <fieldset className="theme-category-picker">
      <legend>Categories</legend>
      <p>Choose every category that fits your theme.</p>
      <div>
        {themeCategories.map((category) => (
          <label key={category}>
            <input
              type="checkbox"
              name="categories"
              value={category}
              defaultChecked={selected.includes(category)}
            />
            {category}
          </label>
        ))}
      </div>
    </fieldset>
  );
}
