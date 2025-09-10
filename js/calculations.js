export const epley1RM = (load, reps) => load * (1 + reps / 30);
export const brzycki1RM = (load, reps) => load * 36 / (37 - reps);
export const setVolume = (reps, load) => reps * load;
