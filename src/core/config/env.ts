function getEnv(name: string): string {
    const value = process.env[name];
  
    if (!value) {
        throw new Error(`Missing required environment variable: ${name}`);
    }
  
    return value;
}
  
export const env = {
    DISCORD_TOKEN: getEnv("DISCORD_TOKEN"),
};