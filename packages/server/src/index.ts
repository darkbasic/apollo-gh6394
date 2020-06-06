import {ApolloServer, gql} from 'apollo-server';

const comments = [
  {id: 1, articleId: 1, content: 'A'},
  {id: 2, articleId: 1, content: 'B'},
  {id: 3, articleId: 1, content: 'C'},
  {id: 4, articleId: 1, content: 'D'},
  {id: 5, articleId: 1, content: 'E'},
  {id: 6, articleId: 2, content: 'F'},
  {id: 7, articleId: 2, content: 'G'},
  {id: 8, articleId: 2, content: 'H'},
  {id: 9, articleId: 2, content: 'I'},
  {id: 10, articleId: 2, content: 'J'},
  {id: 11, articleId: 3, content: 'K'},
  {id: 12, articleId: 3, content: 'L'},
  {id: 13, articleId: 3, content: 'M'},
  {id: 14, articleId: 3, content: 'N'},
  {id: 15, articleId: 3, content: 'O'},
];

const articles = [
  {
    id: 1,
    title: 'First article',
  },
  {
    id: 2,
    title: 'Second article',
  },
  {
    id: 3,
    title: 'Third article',
  },
];

//NOTE: (first: Int, after: ID) has not been implemented, it's here just to show that in a real app it would be there
const paginatedComments = ({articleId, last, before}: {articleId: number; last: number; before?: number}) => {
  const articleComments = comments.filter(comment => comment.articleId === articleId );
  const count = articleComments.length;
  const cursorIndex = before ? articleComments.findIndex(({id: commentId}) => commentId === before) : undefined;
  const beforeCount = articleComments.slice(0, cursorIndex ?? count).length;
  const lastComments = articleComments.slice(Math.max((cursorIndex ?? count - 1) - last, 0), cursorIndex ?? count);
  return {
    count,
    edges: lastComments.map(comment => ({
      cursor: comment.id,
      node: comment,
    })).reverse(),
    pageInfo: {
      hasPreviousPage: beforeCount > last,
      startCursor: lastComments[0]?.id ?? null,
    },
  };
};

const server = new ApolloServer({
  typeDefs: gql`
    type PageInfo {
      startCursor: ID
      hasPreviousPage: Boolean!
    }

    type CommentConnection {
      count: Int!
      edges: [CommentEdge!]!
      pageInfo: PageInfo!
    }

    type CommentEdge {
      cursor: ID!
      node: Comment!
    }

    type Comment {
      id: ID!
      article: Article!
      content: String!
    }

    type Article {
      id: ID!
      title: String!
      comments(last: Int!, before: ID, first: Int, after: ID): CommentConnection!
    }

    type Query {
      articles: [Article!]!
      article(id: ID!): Article!
      comments(articleId: ID!, last: Int!, before: ID, first: Int, after: ID): CommentConnection!
    }

    type Mutation {
      addComment(articleId: ID!, content: String!): Comment!
      removeComment(id: ID!): ID!
    }
  `,
  resolvers: {
    Query: {
      articles() {
        return articles;
      },
      article(root, {id}: {id: number | string}) {
        id = Number(id);
        const article = articles.find(article => article.id === id);
        if (!article) {
          throw new Error(`Cannot find article ${id}`);
        }
        return article;
      },
      comments(root, {articleId, last, before}: {articleId: number | string; last: string | number; before?: string | number}) {
        articleId = Number(articleId);
        last = Number(last);
        before = before != null ? Number(before) : undefined;
        if (!articles.some(({id}) => id === articleId)) {
          throw new Error(`Cannot find article ${articleId}`);
        }
        return paginatedComments({articleId, last, before});
      },
    },
    Article: {
      comments({id}, {last, before}: {last: string | number; before?: string | number}) {
        last = Number(last);
        before = before != null ? Number(before) : undefined;
        return paginatedComments({articleId: id, last, before});
      },
    },
    Comment: {
      article({articleId}) {
        return articles.find(({id}) => id === articleId);
      },
    },
    Mutation: {
      addComment(root, {articleId, content}: {articleId: string | number; content: string}) {
        articleId = Number(articleId);
        if (!articles.some(({id}) => id === articleId)) {
          throw new Error(`Cannot find article ${articleId}`);
        }
        const newComment = {
          id: comments[comments.length - 1].id + 1,
          articleId,
          content,
        };
        comments.push(newComment);
        return newComment;
      },
      removeComment(root, {id}: {id: number | string}) {
        id = Number(id);
        for (const index of comments.keys()) {
          if (comments[index].id === id) {
            comments.splice(index, 1);
            return id;
          }
        }
        throw new Error('Comment not found');
      },
    },
  },
});

server.listen().then(({url}) => console.log(`Server ready at ${url}`));
