/**
 * OpenAPI 3.1 specification for the FlashLearn AI Public API v1.
 */
export const openApiSpec = {
  openapi: '3.1.0',
  info: {
    title: 'FlashLearn AI API',
    version: '1.0.0',
    description:
      'AI-powered flashcard generation and management API. Generate flashcards from text topics, manage sets, and browse public content.',
    contact: {
      name: 'FlashLearn AI Support',
      email: 'support@flashlearn.ai',
    },
  },
  servers: [
    {
      url: '{baseUrl}',
      description: 'FlashLearn API server',
      variables: {
        baseUrl: {
          default: 'https://flashlearn.ai',
        },
      },
    },
  ],
  security: [{ BearerAuth: [] }],
  components: {
    securitySchemes: {
      BearerAuth: {
        type: 'http' as const,
        scheme: 'bearer',
        description:
          'API key obtained from the Developer Portal. Pass as `Authorization: Bearer fl_pub_...`',
      },
    },
    schemas: {
      Flashcard: {
        type: 'object' as const,
        properties: {
          id: { type: 'string' as const, description: 'Flashcard ID' },
          front: { type: 'string' as const, description: 'Question or term (front of card)' },
          back: { type: 'string' as const, description: 'Answer or definition (back of card)' },
        },
        required: ['front', 'back'],
      },
      FlashcardSet: {
        type: 'object' as const,
        properties: {
          id: { type: 'string' as const },
          title: { type: 'string' as const },
          description: { type: 'string' as const },
          source: { type: 'string' as const, enum: ['Prompt', 'PDF', 'YouTube', 'Audio', 'Image', 'CSV'] },
          isPublic: { type: 'boolean' as const },
          cardCount: { type: 'integer' as const },
          rating: { type: 'number' as const },
          createdAt: { type: 'string' as const, format: 'date-time' },
        },
      },
      Category: {
        type: 'object' as const,
        properties: {
          id: { type: 'string' as const },
          name: { type: 'string' as const },
          slug: { type: 'string' as const },
          description: { type: 'string' as const },
        },
      },
      Pagination: {
        type: 'object' as const,
        properties: {
          page: { type: 'integer' as const },
          limit: { type: 'integer' as const },
          total: { type: 'integer' as const },
          totalPages: { type: 'integer' as const },
        },
      },
      ApiError: {
        type: 'object' as const,
        properties: {
          error: {
            type: 'object' as const,
            properties: {
              code: { type: 'string' as const },
              message: { type: 'string' as const },
              details: { type: 'object' as const },
            },
            required: ['code', 'message'],
          },
          meta: {
            type: 'object' as const,
            properties: {
              requestId: { type: 'string' as const },
            },
          },
        },
      },
      UsageResponse: {
        type: 'object' as const,
        properties: {
          keyType: { type: 'string' as const },
          apiTier: { type: 'string' as const },
          period: {
            type: 'object' as const,
            properties: {
              start: { type: 'string' as const, format: 'date-time' },
              end: { type: 'string' as const, format: 'date-time' },
            },
          },
          usage: {
            type: 'object' as const,
            properties: {
              apiCalls: { type: 'integer' as const },
              generationCalls: { type: 'integer' as const },
              overageCalls: { type: 'integer' as const },
            },
          },
          limits: {
            type: 'object' as const,
            properties: {
              burstPerMinute: { type: 'integer' as const, nullable: true },
              monthlyGenerations: { type: 'integer' as const, nullable: true },
              monthlyApiCalls: { type: 'integer' as const, nullable: true },
            },
          },
        },
      },
    },
    parameters: {
      PageParam: {
        name: 'page',
        in: 'query' as const,
        schema: { type: 'integer' as const, default: 1, minimum: 1 },
        description: 'Page number',
      },
      LimitParam: {
        name: 'limit',
        in: 'query' as const,
        schema: { type: 'integer' as const, default: 20, minimum: 1, maximum: 100 },
        description: 'Items per page',
      },
    },
  },
  paths: {
    '/api/v1/generate': {
      post: {
        operationId: 'generateFlashcards',
        summary: 'Generate flashcards from a topic',
        description:
          'Uses AI to generate a set of flashcards on the given topic. If a matching public set exists, returns it instead of generating new cards. This counts as a generation call against your monthly quota.',
        tags: ['Generate'],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object' as const,
                properties: {
                  topic: {
                    type: 'string' as const,
                    description: 'The subject to generate flashcards about',
                    example: 'Photosynthesis in plants',
                  },
                  title: {
                    type: 'string' as const,
                    description: 'Optional title for the created set (defaults to topic)',
                  },
                  description: {
                    type: 'string' as const,
                    description: 'Optional description for the set',
                  },
                },
                required: ['topic'],
              },
            },
          },
        },
        responses: {
          '201': {
            description: 'Flashcards generated successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object' as const,
                  properties: {
                    data: {
                      type: 'object' as const,
                      properties: {
                        flashcards: {
                          type: 'array' as const,
                          items: { $ref: '#/components/schemas/Flashcard' },
                        },
                        setId: { type: 'string' as const },
                        source: { type: 'string' as const, enum: ['generated', 'shared'] },
                        cardCount: { type: 'integer' as const },
                      },
                    },
                    meta: {
                      type: 'object' as const,
                      properties: {
                        requestId: { type: 'string' as const },
                        rateLimit: {
                          type: 'object' as const,
                          properties: {
                            limit: { type: 'integer' as const },
                            remaining: { type: 'integer' as const },
                            reset: { type: 'integer' as const },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
          '400': { description: 'Invalid input', content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiError' } } } },
          '401': { description: 'Unauthorized', content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiError' } } } },
          '429': { description: 'Rate limit or quota exceeded', content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiError' } } } },
          '502': { description: 'AI generation failed', content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiError' } } } },
        },
      },
    },
    '/api/v1/sets': {
      get: {
        operationId: 'listSets',
        summary: 'List your flashcard sets',
        tags: ['Sets'],
        parameters: [
          { $ref: '#/components/parameters/PageParam' },
          { $ref: '#/components/parameters/LimitParam' },
          { name: 'source', in: 'query' as const, schema: { type: 'string' as const }, description: 'Filter by source (Prompt, PDF, YouTube, etc.)' },
        ],
        responses: {
          '200': {
            description: 'List of flashcard sets',
            content: {
              'application/json': {
                schema: {
                  type: 'object' as const,
                  properties: {
                    data: {
                      type: 'object' as const,
                      properties: {
                        sets: { type: 'array' as const, items: { $ref: '#/components/schemas/FlashcardSet' } },
                        pagination: { $ref: '#/components/schemas/Pagination' },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
      post: {
        operationId: 'createSet',
        summary: 'Create a flashcard set',
        tags: ['Sets'],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object' as const,
                properties: {
                  title: { type: 'string' as const, description: 'Set title' },
                  description: { type: 'string' as const },
                  isPublic: { type: 'boolean' as const, default: true },
                  flashcards: {
                    type: 'array' as const,
                    items: {
                      type: 'object' as const,
                      properties: {
                        front: { type: 'string' as const },
                        back: { type: 'string' as const },
                      },
                      required: ['front', 'back'],
                    },
                    minItems: 1,
                  },
                },
                required: ['title', 'flashcards'],
              },
            },
          },
        },
        responses: {
          '201': { description: 'Set created' },
          '400': { description: 'Invalid input', content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiError' } } } },
        },
      },
    },
    '/api/v1/sets/{id}': {
      get: {
        operationId: 'getSet',
        summary: 'Get a flashcard set with all cards',
        tags: ['Sets'],
        parameters: [{ name: 'id', in: 'path' as const, required: true, schema: { type: 'string' as const } }],
        responses: {
          '200': { description: 'Flashcard set with cards' },
          '404': { description: 'Set not found' },
        },
      },
      patch: {
        operationId: 'updateSet',
        summary: 'Update a flashcard set',
        tags: ['Sets'],
        parameters: [{ name: 'id', in: 'path' as const, required: true, schema: { type: 'string' as const } }],
        requestBody: {
          content: {
            'application/json': {
              schema: {
                type: 'object' as const,
                properties: {
                  title: { type: 'string' as const },
                  description: { type: 'string' as const },
                  isPublic: { type: 'boolean' as const },
                  flashcards: { type: 'array' as const, items: { type: 'object' as const, properties: { front: { type: 'string' as const }, back: { type: 'string' as const } }, required: ['front', 'back'] } },
                },
              },
            },
          },
        },
        responses: {
          '200': { description: 'Set updated' },
          '403': { description: 'Not the owner' },
          '404': { description: 'Set not found' },
        },
      },
      delete: {
        operationId: 'deleteSet',
        summary: 'Delete a flashcard set',
        tags: ['Sets'],
        parameters: [{ name: 'id', in: 'path' as const, required: true, schema: { type: 'string' as const } }],
        responses: {
          '200': { description: 'Set deleted' },
          '403': { description: 'Not the owner' },
          '404': { description: 'Set not found' },
        },
      },
    },
    '/api/v1/sets/explore': {
      get: {
        operationId: 'exploreSets',
        summary: 'Browse public flashcard sets',
        tags: ['Sets'],
        parameters: [
          { $ref: '#/components/parameters/PageParam' },
          { $ref: '#/components/parameters/LimitParam' },
          { name: 'search', in: 'query' as const, schema: { type: 'string' as const }, description: 'Search by title or description' },
          { name: 'category', in: 'query' as const, schema: { type: 'string' as const }, description: 'Filter by category' },
          { name: 'sort', in: 'query' as const, schema: { type: 'string' as const, enum: ['recent', 'popular'], default: 'recent' }, description: 'Sort order' },
        ],
        responses: {
          '200': { description: 'List of public sets with pagination' },
        },
      },
    },
    '/api/v1/categories': {
      get: {
        operationId: 'listCategories',
        summary: 'List all categories',
        tags: ['Categories'],
        responses: {
          '200': {
            description: 'List of categories',
            content: {
              'application/json': {
                schema: {
                  type: 'object' as const,
                  properties: {
                    data: {
                      type: 'object' as const,
                      properties: {
                        categories: { type: 'array' as const, items: { $ref: '#/components/schemas/Category' } },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/api/v1/usage': {
      get: {
        operationId: 'getUsage',
        summary: 'Get current billing period usage',
        description: 'Returns usage stats and limits for the API key used to authenticate this request.',
        tags: ['Usage'],
        responses: {
          '200': {
            description: 'Usage data for current period',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/UsageResponse' },
              },
            },
          },
        },
      },
    },
  },
  tags: [
    { name: 'Generate', description: 'AI-powered flashcard generation' },
    { name: 'Sets', description: 'Flashcard set management' },
    { name: 'Categories', description: 'Content categories' },
    { name: 'Usage', description: 'API usage and billing' },
  ],
};
