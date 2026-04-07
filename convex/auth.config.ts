// @ts-nocheck - process.env is available in Node.js/Convex runtime
export default {
  providers: [
    {
      domain: process.env.CONVEX_SITE_URL,
      applicationID: "convex",
    },
  ],
};
