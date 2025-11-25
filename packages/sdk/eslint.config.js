import root_config from "../../../eslint.config.js";

export default [
  ...root_config,
  {
    settings: {
      nextblock_service: "attn-sdk",
    },
  },
];

