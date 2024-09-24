Please check [Demo Page](https://ai-video-platform-internal.azurewebsites.net/platform) to test this quickly

# AI Video Platform
Enhance Your Video Content with Our AI Video Platform
- **GPT-4o Dialogue Integration:** Incorporate GPT-4o dialogue capabilities into your video inputs for AI-driven interactions.
- **Advanced Parallelized Processing:** Utilize parallelized processing technology for a more granular understanding of your videos, supporting longer video inputs without performance loss
- **Specialized Scenario Understanding:** Use few-shot learning with image support to handle specialized scenarios, including novel objects, beyond general understanding
- **Markdown Output Capability:** Convert your video content into structured markdown documents, ensuring organized and accessible documentation

## Key Use Cases:
- **Video to Manual:** Automatically generate manuals from your video content, streamlining the creation of instructional materials
- **Safety Check of Driving Video:** Analyze driving videos for safety checks, identifying potential hazards and ensuring compliance with standards
- **Video Summarization:** Create concise summaries of your video content, making it easier to digest and share key information


## How to use
- Set up environment variables in .env referring to below
    ```
    AZURE_STORAGE_CONNECTION_STRING="xxxx"
    ```
- Install library
    ```
    npm install
    ```
- NPM Build
  ```
  npm run build
  ```
- Run server
  ```
  npm run start
  ```
- Access the site e.g. [http://localhost:3000/platform](http://localhost:3000/platform)

## Contributing

This project welcomes contributions and suggestions.  Most contributions require you to agree to a
Contributor License Agreement (CLA) declaring that you have the right to, and actually do, grant us
the rights to use your contribution. For details, visit https://cla.opensource.microsoft.com.

When you submit a pull request, a CLA bot will automatically determine whether you need to provide
a CLA and decorate the PR appropriately (e.g., status check, comment). Simply follow the instructions
provided by the bot. You will only need to do this once across all repos using our CLA.

This project has adopted the [Microsoft Open Source Code of Conduct](https://opensource.microsoft.com/codeofconduct/).
For more information see the [Code of Conduct FAQ](https://opensource.microsoft.com/codeofconduct/faq/) or
contact [opencode@microsoft.com](mailto:opencode@microsoft.com) with any additional questions or comments.

## Trademarks

This project may contain trademarks or logos for projects, products, or services. Authorized use of Microsoft 
trademarks or logos is subject to and must follow 
[Microsoft's Trademark & Brand Guidelines](https://www.microsoft.com/en-us/legal/intellectualproperty/trademarks/usage/general).
Use of Microsoft trademarks or logos in modified versions of this project must not cause confusion or imply Microsoft sponsorship.
Any use of third-party trademarks or logos are subject to those third-party's policies.
