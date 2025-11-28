import root_config from "../../../eslint.config.js";

export default [
  ...root_config,
  {
    settings: {
      service_name: "attn-sdk",
    },
  },
];

