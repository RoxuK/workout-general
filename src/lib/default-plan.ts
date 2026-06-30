import type { UserConfig } from "./types";

// Generic starter plan used when someone skips the AI personalisation step.
// No assumptions about sex, equipment, injuries or goal — bodyweight-only,
// safe defaults, so the app is fully usable on its own from minute one.
// Sized to feel like a real plan (not a placeholder): 3 sessions x 6
// exercises, 5 recipes per meal moment, a full shopping list.
export function buildDefaultConfig(): UserConfig {
  const today = new Date();
  const start = today.toISOString().slice(0, 10);
  const end = new Date(today);
  end.setDate(end.getDate() + 84); // 12 weeks
  const endDate = end.toISOString().slice(0, 10);

  return {
    plan: {
      id: "starter",
      name: "Starter Plan",
      startDate: start,
      endDate,
      startingWeight: 70,
      targetWeight: 70,
      frequency: "3 days/week · 30–40 min/session",
      structure: "Full body, bodyweight only",
      summary: "A generic 3-day full-body routine to get moving while you build a plan tailored to you. No equipment needed.",
      phases: [
        { name: "Foundation", weeks: "1–6", goal: "Learn the movement patterns and build a consistent habit", rpe: "RPE 5–6" },
        { name: "Progression", weeks: "7–12", goal: "Add reps and sets gradually as the basics feel easy", rpe: "RPE 6–7" },
      ],
      weeklySplit: [
        { day: "Monday", session: "Full Body A" },
        { day: "Tuesday", session: "Rest" },
        { day: "Wednesday", session: "Full Body B" },
        { day: "Thursday", session: "Rest" },
        { day: "Friday", session: "Full Body C" },
        { day: "Saturday", session: "Rest" },
        { day: "Sunday", session: "Rest" },
      ],
      splitNote: "Move sessions around to fit your week — just leave at least a day between them.",
      warmup: {
        duration: "5 min",
        note: "Always warm up before training. Skip or swap anything that causes pain.",
        steps: [
          { exercise: "Light cardio", detail: "2–3 min easy pace — march in place, step-ups, or a short walk" },
          { exercise: "Dynamic stretching", detail: "Arm circles, hip circles, leg swings" },
          { exercise: "Activation", detail: "Bodyweight squats x10, slow and controlled" },
        ],
      },
      sessions: [
        {
          id: "full-body-a",
          name: "Full Body A",
          focus: "Squat, push, core",
          exercises: [
            { name: "Bodyweight Squat", sets: 3, reps: "12–15", rest: "60s", notes: "" },
            { name: "Push-up", sets: 3, reps: "8–12", rest: "60s", notes: "Drop to knees if needed" },
            { name: "Glute Bridge", sets: 3, reps: "15", rest: "45s", notes: "" },
            { name: "Plank", sets: 3, reps: "20–30s", rest: "45s", notes: "" },
            { name: "Mountain Climbers", sets: 2, reps: "20", rest: "45s", notes: "" },
            { name: "Standing Calf Raise", sets: 2, reps: "15", rest: "30s", notes: "" },
          ],
        },
        {
          id: "full-body-b",
          name: "Full Body B",
          focus: "Hinge, pull, core",
          exercises: [
            { name: "Lunge", sets: 3, reps: "10/leg", rest: "60s", notes: "" },
            { name: "Inverted Row", sets: 3, reps: "8–12", rest: "60s", notes: "Use a sturdy table if no bar available" },
            { name: "Superman", sets: 3, reps: "12", rest: "45s", notes: "" },
            { name: "Dead Bug", sets: 3, reps: "10/side", rest: "45s", notes: "" },
            { name: "Wall Sit", sets: 2, reps: "20–30s", rest: "45s", notes: "" },
            { name: "Step-up", sets: 2, reps: "10/leg", rest: "45s", notes: "Use a sturdy step or stair" },
          ],
        },
        {
          id: "full-body-c",
          name: "Full Body C",
          focus: "Full body circuit",
          exercises: [
            { name: "Bodyweight Squat", sets: 3, reps: "15", rest: "45s", notes: "" },
            { name: "Push-up", sets: 3, reps: "10", rest: "45s", notes: "Drop to knees if needed" },
            { name: "Side Plank", sets: 2, reps: "20s/side", rest: "45s", notes: "" },
            { name: "Glute Bridge", sets: 3, reps: "15", rest: "45s", notes: "" },
            { name: "Bicycle Crunch", sets: 2, reps: "20", rest: "45s", notes: "" },
            { name: "Bench Dips", sets: 2, reps: "10", rest: "45s", notes: "Use a sturdy chair" },
          ],
        },
      ],
      progressions: [
        { phase: "Foundation", points: ["Focus on form over speed", "Add a rep or two whenever a set feels easy"] },
        { phase: "Progression", points: ["Add one set to your hardest exercise each week", "Once bodyweight feels easy, consider adding a backpack with light weight"] },
      ],
      safetyNote: "No specific limitations on file — this is a generic starter plan, not personalized. Stop any exercise that causes sharp pain. For a plan built around your goals, equipment, experience and any injuries, go to Settings → Generate plan with AI.",
    },
    nutrition: {
      kcal: 2000,
      protein: 130,
      carbs: 220,
      fats: 65,
      note: "Generic estimate, not personalized to you. Build a tailored target from Settings → Generate plan with AI.",
    },
    recipes: [
      // Breakfast
      { id: "b1", name: "Greek Yogurt with Oats and Berries", moment: "Breakfast", time: "5 min", kcal: 380, protein: 28, carbs: 50, fats: 8, ingredients: ["200g Greek yogurt", "50g rolled oats", "100g berries", "1 tsp honey"], steps: ["Mix the oats into the yogurt and let sit 2 min", "Top with berries and honey"] },
      { id: "b2", name: "Scrambled Eggs on Toast", moment: "Breakfast", time: "10 min", kcal: 420, protein: 26, carbs: 35, fats: 18, ingredients: ["3 eggs", "2 slices wholegrain bread", "Salt, pepper", "1 tsp butter"], steps: ["Scramble the eggs in butter over medium heat", "Toast the bread", "Serve together"] },
      { id: "b3", name: "Oatmeal with Banana and Peanut Butter", moment: "Breakfast", time: "8 min", kcal: 430, protein: 16, carbs: 60, fats: 14, ingredients: ["60g rolled oats", "250ml milk or water", "1 banana", "15g peanut butter"], steps: ["Cook the oats with milk or water over medium heat, 3–4 min", "Top with sliced banana and peanut butter"] },
      { id: "b4", name: "Avocado Toast with Eggs", moment: "Breakfast", time: "10 min", kcal: 420, protein: 22, carbs: 30, fats: 22, ingredients: ["2 slices wholegrain bread", "1/2 avocado", "2 eggs", "Salt, pepper, chili flakes"], steps: ["Toast the bread", "Mash the avocado on top with salt and pepper", "Fry or poach the eggs and place on top"] },
      { id: "b5", name: "Protein Pancakes", moment: "Breakfast", time: "12 min", kcal: 400, protein: 30, carbs: 40, fats: 10, ingredients: ["60g oats, blended into flour", "2 eggs", "1 scoop protein powder", "100ml milk"], steps: ["Blend all ingredients into a smooth batter", "Cook small pancakes in a non-stick pan, 2 min per side", "Serve with fruit if desired"] },
      // Lunch
      { id: "l1", name: "Chicken, Rice and Vegetables", moment: "Lunch", time: "25 min", kcal: 550, protein: 42, carbs: 60, fats: 12, ingredients: ["180g chicken breast", "80g rice (dry)", "200g mixed vegetables", "1 tbsp olive oil"], steps: ["Cook the rice", "Season and pan-cook the chicken", "Steam or sauté the vegetables", "Serve together with a drizzle of oil"] },
      { id: "l2", name: "Tuna and Bean Salad", moment: "Lunch", time: "10 min", kcal: 430, protein: 35, carbs: 35, fats: 14, ingredients: ["1 can tuna in water", "150g cooked beans", "Mixed salad leaves", "1 tbsp olive oil", "Lemon juice"], steps: ["Drain the tuna and beans", "Toss everything with the salad leaves", "Dress with oil and lemon"] },
      { id: "l3", name: "Turkey and Hummus Wrap", moment: "Lunch", time: "8 min", kcal: 450, protein: 32, carbs: 45, fats: 14, ingredients: ["1 large wholegrain wrap", "120g sliced turkey breast", "40g hummus", "Lettuce, tomato, cucumber"], steps: ["Spread hummus over the wrap", "Layer the turkey and vegetables", "Roll tightly and slice in half"] },
      { id: "l4", name: "Quinoa Bowl with Chickpeas and Vegetables", moment: "Lunch", time: "20 min", kcal: 480, protein: 20, carbs: 65, fats: 14, ingredients: ["70g quinoa (dry)", "150g cooked chickpeas", "Mixed roasted vegetables", "1 tbsp olive oil", "Lemon juice"], steps: ["Cook the quinoa", "Roast or steam the vegetables", "Combine everything in a bowl with the chickpeas, oil and lemon"] },
      { id: "l5", name: "Chicken Stir-Fry", moment: "Lunch", time: "20 min", kcal: 500, protein: 40, carbs: 45, fats: 16, ingredients: ["180g chicken breast, sliced", "200g mixed stir-fry vegetables", "60g rice (dry)", "Soy sauce, garlic, ginger"], steps: ["Cook the rice", "Stir-fry the chicken until cooked through", "Add the vegetables, garlic, ginger and a splash of soy sauce", "Serve over rice"] },
      // Dinner
      { id: "d1", name: "Baked Fish with Potatoes", moment: "Dinner", time: "30 min", kcal: 480, protein: 38, carbs: 45, fats: 14, ingredients: ["180g white fish", "200g potatoes", "Lemon, herbs, salt", "1 tbsp olive oil"], steps: ["Preheat oven to 200°C", "Slice and oil the potatoes, bake 20 min", "Add the fish with lemon and herbs, bake 12 more min"] },
      { id: "d2", name: "Stir-Fried Tofu and Vegetables", moment: "Dinner", time: "20 min", kcal: 420, protein: 24, carbs: 40, fats: 16, ingredients: ["200g firm tofu", "200g mixed vegetables", "60g rice noodles", "Soy sauce, garlic, ginger"], steps: ["Soak the noodles", "Pan-fry the tofu until golden", "Add vegetables, garlic and ginger, stir-fry", "Toss in the noodles and a splash of soy sauce"] },
      { id: "d3", name: "Lean Beef with Sweet Potato", moment: "Dinner", time: "25 min", kcal: 520, protein: 38, carbs: 45, fats: 18, ingredients: ["170g lean beef steak", "200g sweet potato", "Mixed green salad", "1 tbsp olive oil"], steps: ["Roast or boil the sweet potato until tender", "Pan-sear the beef to your liking", "Serve with the salad, dressed with oil"] },
      { id: "d4", name: "Lentil and Vegetable Soup", moment: "Dinner", time: "30 min", kcal: 380, protein: 20, carbs: 55, fats: 8, ingredients: ["150g red lentils (dry)", "1 onion, 2 carrots, 1 celery stalk", "Vegetable stock", "Garlic, cumin"], steps: ["Sauté the onion, carrot and celery", "Add the lentils, stock and spices", "Simmer 20–25 min until the lentils are soft"] },
      { id: "d5", name: "Grilled Chicken with Broccoli and Rice", moment: "Dinner", time: "25 min", kcal: 460, protein: 42, carbs: 45, fats: 10, ingredients: ["180g chicken breast", "200g broccoli", "70g rice (dry)", "Lemon, herbs, salt"], steps: ["Cook the rice", "Steam the broccoli", "Grill or pan-cook the chicken with lemon and herbs", "Serve together"] },
      // Snack
      { id: "s1", name: "Apple with Peanut Butter", moment: "Snack", time: "2 min", kcal: 220, protein: 6, carbs: 25, fats: 12, ingredients: ["1 apple", "15g peanut butter"], steps: ["Slice the apple", "Serve with peanut butter for dipping"] },
      { id: "s2", name: "Protein Shake", moment: "Snack", time: "2 min", kcal: 180, protein: 25, carbs: 10, fats: 3, ingredients: ["1 scoop whey protein", "250ml milk or water"], steps: ["Shake or blend together", "Drink"] },
      { id: "s3", name: "Cottage Cheese with Pineapple", moment: "Snack", time: "2 min", kcal: 180, protein: 20, carbs: 18, fats: 3, ingredients: ["200g cottage cheese", "100g pineapple chunks"], steps: ["Combine in a bowl", "Eat"] },
      { id: "s4", name: "Mixed Nuts and Dried Fruit", moment: "Snack", time: "1 min", kcal: 220, protein: 6, carbs: 18, fats: 15, ingredients: ["30g mixed nuts", "20g dried fruit"], steps: ["Combine and portion into a small bag or bowl"] },
      { id: "s5", name: "Hard-Boiled Eggs", moment: "Snack", time: "10 min", kcal: 150, protein: 13, carbs: 1, fats: 10, ingredients: ["2 eggs", "Salt, pepper"], steps: ["Boil the eggs for 9–10 min", "Cool, peel and season"] },
    ],
    shoppingList: [
      { category: "Protein", items: ["Chicken breast", "White fish", "Eggs", "Tuna (canned)", "Firm tofu", "Protein powder", "Greek yogurt", "Cottage cheese", "Turkey breast", "Lean beef", "Cooked chickpeas", "Red lentils"] },
      { category: "Carbs", items: ["Rice", "Rolled oats", "Wholegrain bread", "Wholegrain wraps", "Potatoes", "Sweet potato", "Quinoa", "Rice noodles"] },
      { category: "Vegetables & fruit", items: ["Mixed salad leaves", "Mixed vegetables", "Broccoli", "Onion", "Carrots", "Celery", "Berries", "Apples", "Bananas", "Pineapple", "Avocado", "Lemon"] },
      { category: "Pantry & other", items: ["Olive oil", "Peanut butter", "Honey", "Soy sauce", "Garlic", "Ginger", "Hummus", "Mixed nuts", "Dried fruit", "Vegetable stock", "Cumin"] },
    ],
  };
}
