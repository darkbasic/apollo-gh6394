import React from 'react';
import { useQuery, gql, useMutation, Reference } from '@apollo/client';
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

  const getMoreComments = () => {
    if (data?.comments.pageInfo.hasPreviousPage) {
      fetchMore({
        variables: {
          articleId,
          before: data.comments.pageInfo.startCursor,
        } as any, // Otherwise Apollo won't let me add the optional before arg, typings are wrong
        updateQuery: (prev, {fetchMoreResult}) =>
          fetchMoreResult
            ? {
                ...fetchMoreResult,
                comments: {
                  ...fetchMoreResult.comments,
                  edges: prev.comments.edges.concat(
                    fetchMoreResult.comments.edges,
                  ),
                },
              }
            : prev,
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
