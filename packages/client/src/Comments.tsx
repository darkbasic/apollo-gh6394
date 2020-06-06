import React from 'react';
import { useQuery, gql, useMutation, Reference, useApolloClient } from '@apollo/client';
import { Modifier } from '@apollo/client/cache/core/types/common';
import AddComment from './AddComment';

// Why do we we make a different query instead of reusing the existing getArticle with the comments field?
// Because we don't want to refetch all the article fields every time we trigger fetchMore, they could be heavy.
const getCommentsQuery = gql`
  query getComments($articleId: ID!, $last: Int = 3, $before: ID) {
    comments(articleId: $articleId, last: $last, before: $before) {
      count
      pageInfo {
        startCursor
        hasPreviousPage
      }
      edges {
        cursor
        node {
          id
          content
        }
      }
    }
  }
`;

const removeCommentMutation = gql`
  mutation removeComment($id: ID!) {
    removeComment(id: $id)
  }
`;

function Comments({articleId}: any) {
  const {data, fetchMore} = useQuery(getCommentsQuery, {
    variables: {articleId},
  });
  const apollo = useApolloClient();

  const getMoreComments = () => {
    if (data?.comments.pageInfo.hasPreviousPage) {
      fetchMore({
        variables: {
          articleId,
          before: data.comments.pageInfo.startCursor,
        } as any, // Otherwise Apollo won't let me add the optional before arg, typings are wrong
        updateQuery: (prev, {fetchMoreResult}) => {
          //updateQuery will update the messages query, but since the messages query is fed by the
          //article(id: ID!) query we will need to update it as well
          //Note that we don't even have access to the cache object, so we're forced to use the useApolloClient hook
          apollo.cache.modify({
            id: apollo.cache.identify({
              __typename: 'Article',
              id: articleId,
            }),
            fields: {
              comments(connection: {pageInfo: any; edges: Array<{node: Reference}>}, {toReference}) {
                const olderEdge = fetchMoreResult.comments.edges[fetchMoreResult.comments.edges.length - 1];
                return {
                  ...connection,
                  pageInfo: {
                    ...connection.pageInfo,
                    startCursor: olderEdge.node.id,
                  },
                  edges: connection.edges.concat(fetchMoreResult.comments.edges.map((edge: any) => ({
                    ...edge,
                    //The reference doesn't exist in the cache yet, but that's not a problem because it will be created
                    //by updateQuery once it returns
                    node: toReference({
                      __typename: 'Comment',
                      id: edge.node.id,
                    }),
                  }))),
                };
              },
            },
          });
          return fetchMoreResult
            ? {
                ...fetchMoreResult,
                comments: {
                  ...fetchMoreResult.comments,
                  edges: prev.comments.edges.concat(
                    fetchMoreResult.comments.edges,
                  ),
                },
              }
            : prev;
        }
      });
    }
  };

  const [removeComment] = useMutation(removeCommentMutation, {
    update(cache, {data: mutationData}) {
      if (mutationData) {
        const handleComments: Modifier<{edges: Array<{node: Reference}>}> = (connection, {toReference}) => {
          const deletedRef = toReference({
            __typename: 'Comment',
            id: mutationData.removeComment,
          });
          if (deletedRef === undefined) {
            throw new Error('Cannot identify the comment');
          }
          return {
            ...connection,
            edges: connection.edges.filter(
              ({node}) => node.__ref !== deletedRef.__ref,
            ),
          };
        };

        // This won't work because we use cache redirects (how is the component supposed to know?)
        // But since fetchMore will write a new query to the cache with the new elements appended it would be needed
        // to cover such case as well
        cache.modify({
          fields: {
            comments: handleComments,
          },
        });

        // This will work with cache redirects, but if you triggered fetchMore you will have to run the previous one
        cache.modify({
          id: cache.identify({
            __typename: 'Article',
            id: articleId,
          }),
          fields: {
            comments: handleComments,
          },
        });
      }
    },
  });

  return (
    <>
      {data?.comments?.edges.map((edge: any) => edge.node).map((comment: any) =>
        <div key={comment.id}>
          <div>Comment id: {comment.id}</div>
          <div>Comment content: {comment.content}</div>
          <button onClick={() => removeComment({variables: {id: comment.id}})}>
            Remove comment
          </button>
        </div>
      )}
      <button onClick={() => getMoreComments()}>
        Get more comments
      </button>
      <AddComment articleId={articleId} />
    </>
  );
}

export default Comments;
